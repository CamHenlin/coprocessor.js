# coprocessor.js

TODO: docs already slightly out of date - this works now! update docs to explain how to use

## What is this?
Coprocessor.js is a serial-based, nodejs-backed, remote code execution system. Coprocessor allows remote users connected via serial cable to send JavaScript packages over that serial port, and then interact with those packages via function calls or evaluations. This allows all development to stay on the remote side of the serial port.

Coprocessor is intended to run on a host powerful enough to run modern node.js, like a raspberry pi, modern laptop, etc.

## How does it work?

## What's the purpose?
The intended purpose is writing interesting Internet-connected software for ancient machines, but I'm sure there could be other uses. Specifically I am interested in writing software for a 68000-based Macintosh system, but this strategy could be easily applied to other systems. I will create a Retro68-based package and example application to show how this package could be used.

### Here's my reasoning:
Many machines are simply not powerful enough to get on the Internet or perform intensive operations. Even if you somehow get them connected via an old modem, the software is a compromise, the SSL is nonexistent because the machines are too slow, etc - the list of problems goes on and on.

But old machines almost universally have a serial port or some kind of serial interface. Furthermore, the ports are fast enough to operate on relatively large quantities of plain text, even at 9600bps. Why not provide a simple batch execution system over the serial port?

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

The first part will be:

 - `APPLICATION_ID` denoting a unique ID for the application context. All requests coming from the same remote application should use the same ID

The second part will be:

 - `CALL_ID` used to ensure uniqueness across multiple async calls. each individual request should contain a unique CALL_ID

The third part will be

 - `PROGRAM` new program, this will result in a text transmission of an uninstalled plain text node app. After `npm install` is complete, a success response will be written back over the serial port
 - `FUNCTION` a function call to the loaded program for the loaded APPLICATION_ID. if a return value is present, it will be written back over the serial port
 - `EVAL` eval a JS string in the context of the application. if a return value is present, it will be written back over the serial port

The fourth part will be passed to the specific handler from part 3. this may be split by additional delimiters `&&&` and `@@@` - do not use these delimeters in your software

An application context must be created prior to calling any functions or running any evaluations. Here is a simple example of 3 commands that could be sent across the serial part from a remote system to the one running coprocessor to set up an application context and run a function and an evaluation:

```
these are referenced in the commands below:
const TEST_INDEX = `const _ = require('lodash')\nclass SimpleNodeThing {\n  static isEmpty (variable) {\n    return _.isEmpty(variable)\n  }\n  isEmpty (variable) {\n    return this.constructor.isEmpty(variable)\n  }\n}\nmodule.exports = SimpleNodeThing`

const TEST_PACKAGE = `{\n  "name": "test",\n  "version": "1.0.0",\n  "description": "",\n  "main": "index.js",\n  "scripts": {\n    "test": ""\n  },\n  "author": "",\n  "license": "ISC",\n  "dependencies": {\n    "lodash": "^4.17.21"\n  }\n}`
```

- `TEST_APPLICATION_ID;;;TEST_CALL_ID_1;;;PROGRAM;;;index.js@@@${TEST_INDEX}&&&package.json@@@${TEST_PACKAGE}` -> this would result in `TEST_APPLICATION_ID;;;TEST_CALL_ID_1;;;PROGRAM;;;SUCCESS` being sent back over the serial cable
- `TEST_APPLICATION_ID;;;TEST_CALL_ID_2;;;FUNCTION;;;isEmpty&&&test` -> this would result in `TEST_APPLICATION_ID;;;TEST_CALL_ID_2;;;FUNCTION;;;isEmpty;;;SUCCESS;;;false` being sent back over the serial cable
- `TEST_APPLICATION_ID;;;TEST_CALL_ID_3;;;EVAL;;;console.log(this)` -> this will result in the coprocessor server logging out "this", but will not send anything back over the serial cable as there was no return

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

## How are the JavaScript applications structured?
For now, the applications are somewhat limited. Here are some basic notes:

- All of the files for the application must be sent in a single command
- `@@@`, `&&&`, `;;;` cannot be used in your application
- subdirectories are not supported
- the entry point to your application must be `index.js`

TODO: provide a better example

## What's next
This seems to work fine on a local test machine accepting fake commands at the bottom of `index.js`. Next step is to provide operational examples on the Retro68 side, then create a simple interaction library there.


# Additional note about tty0tty for local testing
copied from: https://www.sagunpandey.com/2016/02/setup-virtual-serial-ports-using-tty0tty-in-linux/
Installing tty0tty:

Download the tty0tty package from one of these sources:
1.1 http://sourceforge.net/projects/tty0tty/files/
1.2 clone the repo https://github.com/freemed/tty0tty
Extract it
2.1 tar xf tty0tty-1.2.tgz
Build the kernel module from provided source
3.1 cd tty0tty-1.2/module
3.2 make
Copy the new kernel module into the kernel modules directory
4.1 sudo cp tty0tty.ko /lib/modules/$(uname -r)/kernel/drivers/misc/
Load the module
5.1 sudo depmod
5.2 sudo modprobe tty0tty
5.3 You should see new serial port/libs in /dev/ (ls /dev/tnt*)
Give appropriate permissions to the new serial ports
6.1 sudo chmod 666 /dev/tnt*
You can now access the serial ports as /dev/tnt0 (1,2,3,4 etc)

Note that the consecutive ports are interconnected. For example, /dev/tnt0 and /dev/tnt1 are connected as if using a direct cable.

Persisting across boot:

Edit the file /etc/modules (Debian) or /etc/modules.conf and add the following line:
tty0tty

Note that this method will not make the module persist over kernel updates so if you ever update your kernel, make sure you build tty0tty again and repeat the process.