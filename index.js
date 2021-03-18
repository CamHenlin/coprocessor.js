const SerialPort = require('serialport')
const fs = require('fs').promises
const rimraf = require('rimraf');
const { spawn } = require('child_process')
const Delimiter = SerialPort.parsers.Delimiter

const MESSAGE_DELIMITER = `;;@@&&`
const parser = new Delimiter({
  delimiter: MESSAGE_DELIMITER,
  includeDelimiter: false
})

const SERIAL_PORT = process.env.SERIAL_PORT || '/dev/ttys000'
const port = new SerialPort(SERIAL_PORT, {
  baudRate: 9600
})

const DELIMETER = `;;;`
const FILE_OR_FUNCTION_DELIMETER = `&&&`
const FILE_META_DELIMETER = `@@@`
const log = console.log

let applicationContexts = {}

const writeData = (data) => {

  log(`writeData:`)
  log(data)

  port.write(data)
}

// data will be handled in 3 parts, split by DELIMETER
// the first part will be:
//  - APPLICATION_ID denoting a unique ID for the application context
// the second part will be:
//  - CALL_ID used to ensure uniqueness across multiple async calls
// the third part will be
//  - PROGRAM new program, this will result in a text transmission of an uninstalled node app.
//      after `npm install` is complete, a success response will be written back over the serial port
//      programs are expected to use process.send
//  - FUNCTION a function call to the loaded program for the loaded APPLICATION_ID. if a return
//      value is present, it will be written back over the serial port
//  - EVAL eval a JS string in the context of the application. if a return value is present,
//      it will be written back over the serial port
// the third part will be passed to the specific handler from part 3
const handleData = (data) => {

  if (!data) {

    writeData(`FAILURE;;;NO DATA;;;${data}${MESSAGE_DELIMITER}`)

    return
  }

  if (!data.split) {

    writeData(`FAILURE;;;MALFORMED DATA - SPLIT NOT AVAILABLE;;;${data}${MESSAGE_DELIMITER}`)

    console.log(data)
    console.log(typeof data)
    console.log(`"${data}"`)

    return
  }

  const splitData = data.split(DELIMETER)

  // avoid doing anything with malformed data for now
  if (splitData.length !== 4) {

    writeData(`FAILURE;;;MALFORMED DATA${MESSAGE_DELIMITER}`)

    return
  }

  const APPLICATION_ID = splitData[0]
  const CALL_ID = splitData[1]
  const OPERATION = splitData[2]
  const OPERAND = splitData[3]

  switch (OPERATION) {

    case `PROGRAM`:

      return instantiateProgram(APPLICATION_ID, CALL_ID, OPERAND)

    case `FUNCTION`:

      return runFunction(APPLICATION_ID, CALL_ID, OPERAND)

    case `EVAL`:

      return evalOperand(APPLICATION_ID, CALL_ID, OPERAND)

    default:

      writeData(`${APPLICATION_ID};;;${CALL_ID};;;${OPERATION};;;FAILURE;;;MALFORMED OPERATION${MESSAGE_DELIMITER}`)

      return
  }

  return
}

const evalOperand = async (APPLICATION_ID, CALL_ID, OPERAND) => {

  if (!applicationContexts[APPLICATION_ID]) {

    writeData(`${APPLICATION_ID};;;${CALL_ID};;;EVAL;;;FAILURE;;;APPLICATION NOT INSTANTIATED${MESSAGE_DELIMITER}`)

    return
  }

  const returnValue = await async function (str) {

    return await eval(str)
  }.call(applicationContexts[APPLICATION_ID], OPERAND)

  writeData(`${APPLICATION_ID};;;${CALL_ID};;;EVAL;;;SUCCESS;;;${returnValue}${MESSAGE_DELIMITER}`)

  return
}

const runFunction = async (APPLICATION_ID, CALL_ID, OPERAND) => {

  const splitOperand = OPERAND.split(FILE_OR_FUNCTION_DELIMETER)
  const FUNCTION = splitOperand.shift()

  if (!applicationContexts[APPLICATION_ID]) {

    writeData(`${APPLICATION_ID};;;${CALL_ID};;;FUNCTION;;;FAILURE;;;APPLICATION NOT INSTANTIATED${MESSAGE_DELIMITER}`)

    return
  }

  if (!applicationContexts[APPLICATION_ID][FUNCTION]) {

    writeData(`${APPLICATION_ID};;;${CALL_ID};;;FUNCTION;;;FAILURE;;;FUNCTION NOT FOUND ON APPLICATION${MESSAGE_DELIMITER}`)

    return
  }

  const returnValue = await applicationContexts[APPLICATION_ID][FUNCTION](...splitOperand)

  writeData(`${APPLICATION_ID};;;${CALL_ID};;;FUNCTION;;;SUCCESS;;;${returnValue}${MESSAGE_DELIMITER}`)

  return
}

const createDirectoryForApplication = async (APPLICATION_ID) => {

  await new Promise((resolve) => {

    return rimraf(`${__dirname}/${APPLICATION_ID}`, resolve);
  })

  await fs.mkdir(`${__dirname}/${APPLICATION_ID}`)
}

const createFileForApplication = async (APPLICATION_ID, fileName, fileText) => {

  console.log(`fileName`)
  console.log(fileName)
  console.log(`fileText`)
  console.log(fileText)

  await fs.writeFile(`${__dirname}/${APPLICATION_ID}/${fileName.trim()}`, fileText)
}

const runNpmInstallForApplication = async (APPLICATION_ID) => {

  const command = spawn(`npm`, [`i`], {
    env: process.env,
    cwd: `${__dirname}/${APPLICATION_ID}`,
    stdio: `inherit`
  })

  await new Promise((resolve, reject) => {

    command.on(`error`, reject);
    command.on(`close`, resolve);
  })
}

const runApplication = async (APPLICATION_ID, CALL_ID) => {

  const options = {
    stdio: [ 'pipe', 'pipe', 'pipe', 'ipc' ]
  };

  let applicationContext

  try {

    // note in docs: you must use index.js as your entrypoint
    const application = require(`${__dirname}/${APPLICATION_ID}/index.js`)
    applicationContext = new application()
  } catch (err) {

    writeData(`${APPLICATION_ID};;;${CALL_ID};;;PROGRAM;;;FAILURE;;;runApplication:${err.message}${MESSAGE_DELIMITER}`)

    return
  }

  applicationContexts[APPLICATION_ID] = applicationContext

  writeData(`${APPLICATION_ID};;;${CALL_ID};;;PROGRAM;;;SUCCESS;;;SUCCESS${MESSAGE_DELIMITER}`)

  return
}

const checkIfProgramAlreadyExists = async (APPLICATION_ID) => {
  
}

// set up all of the directories and files sent across the serial port, run an npm install, then run the application
// NOTE! need to document what an "application" must look like and the restrictions on it
// NOTE! need to provide an example "application"
const instantiateProgram = async (APPLICATION_ID, CALL_ID, OPERAND) => {

  // try {

  //   await createDirectoryForApplication(APPLICATION_ID)

  //   const applicationFiles = OPERAND.split(FILE_OR_FUNCTION_DELIMETER)

  //   for (const applicationFileParts of applicationFiles) {

  //     const applicationMeta = applicationFileParts.split(FILE_META_DELIMETER)
  //     const fileName = applicationMeta[0]
  //     const fileText = applicationMeta[1]

  //     await createFileForApplication(APPLICATION_ID, fileName, fileText)
  //   }

  //   await runNpmInstallForApplication(APPLICATION_ID)
  // } catch (err) {

  //   writeData(`${APPLICATION_ID};;;${CALL_ID};;;PROGRAM;;;FAILURE;;;instantiateProgram:${err.message}`)

  //   return
  // }

  return runApplication(APPLICATION_ID, CALL_ID)
}

// // Read data that is available but keep the stream in "paused mode"
// // this results in char by char buffers being read in
// port.on('readable', function () {

//   console.log('Data:', port.read())
// })

// port.on('open', function () {

//   console.log('port is open')
//   //port.write('coprocessor: port is open')
// })

// Switches the port into "flowing mode"
// port.on('data', function (data) {

//   console.log(`PORT DATA:`)
//   console.log(data)
//   handleData(data)
// })

port.pipe(parser)

parser.on('data', function (data) {

  // console.log(`PORT DATA LINE:`)
  // console.log(data)
  handleData(new String(data))
})

// Open errors will be emitted as an error event
port.on('error', function(err) {

  console.log('Error: ', err.message)
})

console.log(`instantiated program, waiting for data on ${SERIAL_PORT}`)
// NOTE! escaping strings within strings will break things, don't do that for now
// NOTE! avoid the use of ;;;, &&&, @@@ - those are internally-used delimeters
// const TEST_INDEX = `const _ = require('lodash')\nclass SimpleNodeThing {\n  static isEmpty (variable) {\n    return _.isEmpty(variable)\n  }\n  isEmpty (variable) {\n    return this.constructor.isEmpty(variable)\n  }\n}\nmodule.exports = SimpleNodeThing`
// const TEST_PACKAGE = `{\n  "name": "test",\n  "version": "1.0.0",\n  "description": "",\n  "main": "index.js",\n  "scripts": {\n    "test": ""\n  },\n  "author": "",\n  "license": "ISC",\n  "dependencies": {\n    "lodash": "^4.17.21"\n  }\n}`
// const TEST_APP_INSTANTIATION = `TEST_APPLICATION_ID;;;TEST_CALL_ID_1;;;PROGRAM;;;index.js@@@${TEST_INDEX}&&&package.json@@@${TEST_PACKAGE}`
// const TEST_APP_FUNCTION_CALL = `TEST_APPLICATION_ID;;;TEST_CALL_ID_2;;;FUNCTION;;;isEmpty&&&test`
// const TEST_APP_EVAL_CALL = `TEST_APPLICATION_ID;;;TEST_CALL_ID_3;;;EVAL;;;console.log(this)`

// handleData(TEST_APP_INSTANTIATION)

// setTimeout(() => {

//   handleData(TEST_APP_FUNCTION_CALL)
//   handleData(TEST_APP_EVAL_CALL)
// }, 2000)






