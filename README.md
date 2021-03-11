# coprocessor.js

## What is this?
Coprocessor is a serial-based, nodejs-backed, remote code execution system. Coprocessor allows remote users connected via serial cable to send JavaScript packages over that serial port, and then interact with those packages via function calls or evaluations. This allows all development to stay on the remote side of the serial port.

## How does it work?

## What's the purpose?
The intended purpose is writing interesting Internet-connected software for ancient machines, but I'm sure there could be other uses. Specifically I am interested in writing software for a 68000-based Macintosh system, but this strategy could be easily applied to other systems. I will create a Retro68-based package and example application to show how this package could be used.

### Here's my reasoning:
Many machines are simply not powerful enough to get on the Internet or perform intensive operations. Even if you somehow get them connected via an old modem, the software is a compromise, the SSL is nonexistent because the machines are too slow, etc - the list of problems goes on and on.

But old machines almost universally have a serial port or some kind of serial interface. Furthermore, the ports are fast enough to operate on relatively large quantities of plain text, even at 9600kbps. Why not provide a simple batch execution system over the serial port?

Sure, *old* Internet-connected apps still won't work using this strategy, but we could write new ones, with a new environment, with lots of packages already available, and all we need is a serial cable that can connect to our old computer and our new computer at both ends - no fancy modems or anything.

## Okay, I'm convinced! How do I use it?

### Get it running on the host machine
WIP, needs expanded

clone this repo:
```
git clone this repo
```

install it:
```
cd coprocessor.js
npm install
```

then run it, note that your serial port may be different:
```
SERIAL_PORT=/dev/ttys000 npm run server
```

### Now send things over the serial port
WIP, provide example repo
Here's a loose documentation for the communications format used by coprocessor:

data will be handled in 4 parts, split by delimeter `;;;`

the first part will be:
 - `APPLICATION_ID` denoting a unique ID for the application context. all requests coming from the same remote application should use the same ID
the second part will be:
 - `CALL_ID` used to ensure uniqueness across multiple async calls. each individual request should contain a unique CALL_ID
the third part will be
 - `PROGRAM` new program, this will result in a text transmission of an uninstalled node app.
     after `npm install` is complete, a success response will be written back over the serial port
 - `FUNCTION` a function call to the loaded program for the loaded APPLICATION_ID. if a return
     value is present, it will be written back over the serial port
 - `EVAL` eval a JS string in the context of the application. if a return value is present,
     it will be written back over the serial port
the fourth part will be passed to the specific handler from part 3. this may be split by additional delimiters `%%%` and `@@@` - do not use these delimters in your software

An application context must be created prior to calling any functions or running any evaluations. Here is a simple example of 3 commands that could be sent across the serial part from a remote system to the one running coprocessor to set up an application context and run a function and an evaluation:

`TEST_APPLICATION_ID;;;TEST_CALL_ID_1;;;PROGRAM;;;index.js@@@${TEST_INDEX}%%%package.json@@@${TEST_PACKAGE}`
`TEST_APPLICATION_ID;;;TEST_CALL_ID_2;;;FUNCTION;;;isEmpty%%%test`
`TEST_APPLICATION_ID;;;TEST_CALL_ID_3;;;EVAL;;;console.log(this)`

note that `TEST_INDEX` and `TEST_PACKAGE` above should be considered to be simple nodejs index.js and package.json files, with no other files expected (TODO expand on this)

### How do the responses look?
WIP, provide additional messaging around response and error handling

Responses are formatted in a similar way to requests.

potential responses - TODO provide explanations for each of these:
- `FAILURE;;;MALFORMED DATA`
- `${APPLICATION_ID};;;${CALL_ID};;;${OPERATION};;;FAILURE;;;MALFORMED OPERATION`
- `${APPLICATION_ID};;;${CALL_ID};;;EVAL;;;FAILURE;;;APPLICATION NOT INSTANTIATED`
- `${APPLICATION_ID};;;${CALL_ID};;;EVAL;;;SUCCESS;;;${returnValue}`
- `${APPLICATION_ID};;;${CALL_ID};;;FUNCTION;;;${FUNCTION};;;FAILURE;;;APPLICATION NOT INSTANTIATED`
- `${APPLICATION_ID};;;${CALL_ID};;;FUNCTION;;;${FUNCTION};;;FAILURE;;;FUNCTION NOT FOUND ON APPLICATION`
- `${APPLICATION_ID};;;${CALL_ID};;;FUNCTION;;;${FUNCTION};;;SUCCESS;;;${returnValue}`
- `${APPLICATION_ID};;;${CALL_ID};;;PROGRAM;;;FAILURE;;;runApplication:${err.message}`
- `${APPLICATION_ID};;;${CALL_ID};;;PROGRAM;;;SUCCESS`
- `${APPLICATION_ID};;;${CALL_ID};;;PROGRAM;;;FAILURE;;;instantiateProgram:${err.message}`

## That seems unsecure
Yes, it is assumed that there is full trust between the serial-connected machine and the host. The host will do whatever the remote machine asks.

## What's next
This seems to work fine on a local test machine accepting fake commands at the bottom of `index.js`. Next step is to provide operational examples on the Retro68 side, then create a simple interaction library there.
