# distance-matrix

A basic CLI to calculate the distance and journey time from origins and destinations held in a CSV file.

## Installation

    npm install mhingston/distance-matrix
    
## Usage

First insert your Google Maps API key into `.env`.

```bash
node app.js --input=input.csv --origin-header=Origin --destination-header=Destination --output=output.csv
```