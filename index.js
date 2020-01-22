const fs = require('fs');
const https = require('https');
const path = require('path');
const spawn = require('child_process').spawn;

/**
 * @description Small wrapper for logging and avoiding duplicating use of console.log
 * @param {any} content The content of the log
 * @param {Promise} [promise] When set, the report will report the end of the promise
 */
async function report(content, promise) {
    console.log(content);
    if (promise) {
        await promise;
        console.log("done");
    }
}

/**
 * @description download the body of a prompted url
 * @param {string} url the full URI path to download
 * @param {string} filename the filename in wich we want to save the content
 * @returns {Promise<https.IncomingMessage>} that ends up while the file is written
 */
async function download(url, filename) {
    const parsed = new URL(url);
    let options = {
        path: parsed.pathname,
        hostname: parsed.hostname,
        port: parsed.port
    };

    return new Promise((resolve, reject) => {
        const ws = fs.createWriteStream(filename);
        const request = https.get(options, (response) => {
            // check if response is success
            if (response.statusCode !== 200) {
                return reject(new Error('An error occurred when downloading a file, request status is ' + response.statusCode));
            }
            response.pipe(ws);
            ws.on('close', () => {
                resolve(response);
            }).on('error', (error) => {
                reject(error.message);
            });
        });


        // check for request error too
        request.on('error', function (err) {
            reject(err);
        });
    }).catch((e) => {
        try {
            fs.unlinkSync(filename);
        } catch {
            // ignore
        }
        throw e;
    });
}

/**
 * @description Wrap spawn into a promise
 * @param {string} cmd the command to spawn
 * @param {Array<string>} args the command arguments array
 * @param {object} options
 * @returns {Promise}
 */
async function spawnPromise(cmd, args, options) {
    let stderr = '';
    let stdout = '';
    return new Promise((resolve, reject) => {
        const child = spawn(cmd, args, options);

        child.stderr.on('data', (data) => {
            stderr += data;
        });

        child.stdout.on('data', (data) => {
            stdout += data;
        });

        child.on('error', (error) => {
            return reject(new Error(`Fail to start subprocess ${error} : \n${stderr}`));
        });

        child.on('close', (code) => {
            if (code !== 0) {
                report(`Command error code is ${code}`);
                return reject(new Error(stderr));
            }
            return resolve();
        });
    });
}

/**
 * @description Main patching logic goes here
 */
async function main() {
    const args = process.argv.slice(2);
    const target = args[0];

    // In case of '-h' or '--help' print usefull usage help
    if (target === '-h' || target === '--help' || !target) {
        report("Usage : targetfile [timezone-version] [icu-version]  [endianness]");
        report("\ttargetfile : a path to a valid .dat file");
        report("\t[timezone-version] : default is '2019c'");
        report("\t[icu-version] : default is '44' (for nodejs)");
        report("\t[endianness] : default is 'le' (for nodejs)");
        report("");
        report("Example : node ./index.js ./icudt61l.dat 2019c 44 le");
        return;
    }
    // In case the file is invalid :
    if (!fs.existsSync(target)) {
        return Promise.reject("non valid icudtxxl.dat provided, can't patch !");
    }

    // Otherwise parse arguments and give them their default value
    const timezoneVersion = args[1] || '2019c';
    const icuVersion = args[2] || '44';
    const endian = args[3] || 'le';

    // Here we go !
    report(`Our ICU target is ${timezoneVersion}, for icu v${icuVersion} in '${endian}' endianess`);
    const URL = `https://raw.githubusercontent.com/unicode-org/icu-data/master/tzdata/icunew/${timezoneVersion}/${icuVersion}/${endian}/`;
    // This is the list of files we need to patch
    const files = ['metaZones.res', 'timezoneTypes.res', 'windowsZones.res', 'zoneinfo64.res'];

    // Foreach file, download and patch it using icupkg
    for (const ind in files) {
        if (files.hasOwnProperty(ind)) {
            const filename = files[ind];
            const filePath = path.join(dir, filename);

            await report(`Downloading ${URL + filename}`,
                download(URL + filename, filePath));
            await report(`Patching ${filename}`,
                spawnPromise('icupkg', ['-a', filename, target], { cwd: dir }));
            fs.unlinkSync(filePath);
        }
    }
}

main().catch((error) => {
    report(error);
    process.exit(2);
});