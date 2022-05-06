const fs = require('fs/promises');
const inputArguments = process.argv;
const acceptedFileTypes = ['csv'];


let fileType = '';
const commands = {};
const inputIsValid = checkInput(inputArguments);

const actions = {
    "csv": parseCSV.bind(null, inputArguments)
}

if(inputIsValid && actions[fileType]) {
    actions[fileType]();
}

function checkInput(consoleInputArgs) {
    if (consoleInputArgs.length < 3) {
        console.log('Please provide arguments in order to use this service!');
        console.log('Usage: "node productParser --file FILE_LOCATION --unique-combinations=NEW_FILE_NAME"');
        console.log('Select file to parse: ');
        return false;
    } else {
        for (let i = 2; i < consoleInputArgs.length; i++) {
            if (consoleInputArgs[i].startsWith('--')) {
                const command = consoleInputArgs[i].slice(2);
                if (command.split('=').length > 1) {
                    let [currentCommand, currentValue] = [...command.split('=')];
                    fileType = currentValue.split('.')[1];

                    if (!acceptedFileTypes.includes(fileType)) {
                        console.log(`Output file type of ${fileType} is not supported`);
                        return false;
                    }

                    commands[currentCommand] = currentValue;
                    return true;
                }

                if (!consoleInputArgs[i + 1]) {
                    console.log(`Error: After command: ${command} you must include a value.`);
                    return false;
                }
                
                fileType = consoleInputArgs[i + 1].split('.')[1];
                if (!acceptedFileTypes.includes(fileType)) {
                    console.log(`Input file type of ${fileType} is not supported`);
                    return false;
                }

                commands[`${command}`] = consoleInputArgs[i + 1];
                i += 1;
            }
        }

        if (!commands['file'] || !commands['unique-combinations']) {
            console.log('You must use both: file and unique-combinations commands in order to use this service.');
            return false;
        }
        return true;
    }
}



async function parseCSV() {

    const stats = await fs.stat(`${commands['file']}`);
    const fileSizeInMb = Math.round(stats.size / (1024 * 1024));
    
    if (fileSizeInMb > 20) {
        console.log('File can\'t be larger than 15 MB');
        return false;
    }

    let filteredRows = [];
    let headings = '';

    const fileHandler = await fs.open(`${commands['file']}`);
    const data = await fileHandler.readFile();
    fileHandler.close();

    const text = data.toString();
    const separatedRows = text.split("\n").map(item => item.replace(/"/g, ''));

    headings = separatedRows.splice(0, 1)[0].split(',').map(item => item.split('_')[0]);
    headings.push('count\n');
    headings = headings.join(',');
    console.log('Parsing...');
    filteredRows = separatedRows.reduce((acc, currentRow, i) => {

        const [make, model, condition, capacity, grade, colour, network] = [...currentRow.split(',')];
        if (!make || !model) {
            console.log('Make and Model are required in every product.');
            return acc;
        }

        if (acc.length) {
            const filteredProduct = acc.filter(product => product.make === make
                && product.model === model
                && product.colour === colour
                && product.capacity === capacity
                && product.grade === grade
                && product.condition === condition
                && product.network === network)[0];

            if (filteredProduct) {
                filteredProduct.count += 1;
                return acc;
            }
        }

        acc.push({ make, model, condition: condition || '', capacity: capacity || '', grade: grade || '', colour: colour || '', network: network || '', count: 1 });

        return acc;
    }, []);

    filteredRows = filteredRows.reduce((acc, currentObj, index) => {
        console.log(`${index + 1}. 
        Make: ${currentObj.make}, 
        Model: ${currentObj.model}, 
        Condition: ${currentObj.condition}, 
        Capacity: ${currentObj.capacity}, 
        Grade: ${currentObj.grade}, 
        Color: ${currentObj.colour}, 
        Network: ${currentObj.network},
        Count: ${currentObj.count}`);

        acc.push(`${currentObj.make},${currentObj.model},${currentObj.condition},${currentObj.capacity},${currentObj.grade},${currentObj.colour},${currentObj.network},${currentObj.count}\n`);
        return acc;
    }, []);


    console.log(`Saving to new ${commands['unique-combinations']}`,);
    await fs.writeFile(commands['unique-combinations'], (headings));

    for (let row of filteredRows) {
        await fs.appendFile(commands['unique-combinations'], row);
    }
    console.log('Completed!');
}