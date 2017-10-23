require('dotenv').config();
const program = require('commander');
const fs = require('fs');
const path = require('path');
const util = require('util');
const csv = 
{
    parse: util.promisify(require('csv-parse')),
    stringify: util.promisify(require('csv-stringify'))
};
const request = require('request-promise-native');
const _ = require('lodash');
const file =
{
    read: util.promisify(fs.readFile),
    write: util.promisify(fs.writeFile)
};

const API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const METRES_IN_MILE = 1609.34;
const SECONDS_IN_MINUTE = 60;

const main = async (inputFile, originHeader, destinationHeader, outputFile) =>
{
    const cache = [];
    const raw = await file.read(path.isAbsolute(inputFile) ? inputFile : path.join(__dirname, inputFile));
    const data = await csv.parse(raw, {relax: true});
    const headers = data.shift();
    headers.push('Distance (Miles)');
    headers.push('Duration (Minutes)');

    for(const row of data)
    {
        let origin, destination;
        const originIndex = headers.indexOf(originHeader);
        const destinationIndex = headers.indexOf(destinationHeader);

        if(originIndex >= 0)
        {
            origin = row[originIndex];
        }

        if(destinationIndex >= 0)
        {
            destination = row[destinationIndex];
        }

        if(!origin || !destination)
        {
            continue;
        }

        const cached = _.find(cache, (item) => item.origin === origin && item.destination === destination);

        if(cached)
        {
            row.push(cached.distance);
            row.push(cached.duration);
        }

        else
        {
            const response = await request(
            {
                method: 'GET',
                url: `https://maps.googleapis.com/maps/api/distancematrix/json?units=imperial&origins=${origin}&destinations=${destination}&key=${API_KEY}`,
                json: true,
                resolveWithFullResponse: true
            });

            if(response.statusCode === 200)
            {
                let distance = _.get(response, 'body.rows[0].elements[0].distance.value');
                let duration = _.get(response, 'body.rows[0].elements[0].duration.value');

                if(distance && duration)
                {
                    distance = (distance / METRES_IN_MILE).toFixed(2);
                    duration = Math.round(duration / SECONDS_IN_MINUTE);
                    row.push(distance);
                    row.push(duration);  
                    cache.push(
                    {
                        origin,
                        destination,
                        distance,
                        duration
                    });  
                }
            }
        }
    }

    data.unshift(headers);
    const output = await csv.stringify(data);
    file.write(path.isAbsolute(outputFile) ? outputFile : path.join(__dirname, outputFile), output);
}

program
.version('1.0.0')
.usage('[options]')
.option('-i, --input [value]', 'Input file')
.option('-oh, --origin-header [value]', 'Column header within the input file that represents the origin')
.option('-dh, --destination-header [value]', 'Column header within the input file that represents the destination')
.option('-o, --output [value]', 'Output file')
.parse(process.argv);

if(!program.input)
{
    console.error('Error: Please specify an input (CSV) file.');
    process.exit(1);
}

if(!program.originHeader)
{
    console.error('Error: Please specify an origin header.');
    process.exit(1);
}

if(!program.destinationHeader)
{
    console.error('Error: Please specify a destination header.');
    process.exit(1);
}

main(program.input, program.originHeader, program.destinationHeader, program.output || program.input);