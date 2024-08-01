const path = require('path');
const { createFolderIfNotExists, checkIfFolderExists } = require('./utils/fsHelper');
const { downloadJSON, downloadImage } = require('./utils/axiosHelper');
const { saveCardImage, resizeImage, combineImages } = require('./utils/sharpHelper');

/*
    Use this script when you need to download a card, a set or the whole language collection
    to download the imagen, resize it and create a square copy.
*/

const languagesList = ['en', 'es', 'fr', 'de', 'it', 'ja'];
const localeDictionary = {
    en: 'english',
    es: 'spanish',
    fr: 'french',
    de: 'german',
    it: 'italian',
    ja: 'japanese'
};

// API to retrieve all the existing cards by language
const composeInitialApiUrl = (locale) => `https://cards.fabtcg.com/api/search/v1/cards/?language=${locale}&limit=50&offset=0&ordering=cards`;

// API to retrieve a specific collection and language
// const composeInitialApiUrl = (locale) => `https://cards.fabtcg.com/api/search/v1/cards/set_code=EVO&language=${locale}`;

// API to retrieve a specific card by card code and language
// const composeInitialApiUrl = (locale) => `https://cards.fabtcg.com/api/search/v1/cards/?q=2HP532&language=${locale}`;

// API to retrieve a specific card by name, collection and language
// const composeInitialApiUrl = (locale) => `https://cards.fabtcg.com/api/search/v1/cards/?name=Teklo+Foundry+Heart&set_code=EVO&language=${locale}`;

const mediaFolderPath = `${path.dirname(path.dirname(__filename))}/media/missing`;

const createOutputFolderIfNotExists = (language, folderName) => {
    const outputFilePath = `${mediaFolderPath}/${folderName}/${localeDictionary[language]}/`;
    createFolderIfNotExists(outputFilePath);
}

const getFilePathsByImageName = (imageUrl, language) => {
    const imageName = path.basename(imageUrl).replace(`${language.toUpperCase()}_`, '').replace('-RF', '');
    return {
        cardImages: `${mediaFolderPath}/cardimages/${localeDictionary[language]}/${imageName}`,
        cardSquares: `${mediaFolderPath}/cardsquares/${localeDictionary[language]}/${imageName}`
    };
};

async function main() {
    for (const language of languagesList) {
        console.log(`------------------------ Starting ${localeDictionary[language]} language ------------------------`)
        try {
            let data = {
                next: composeInitialApiUrl(language)
            };
            let batchNumber = 1;

            createOutputFolderIfNotExists(language, 'cardimages');
            createOutputFolderIfNotExists(language, 'cardsquares');

            do {
                data = await downloadJSON(composeInitialApiUrl(language));
                for (const card of data.results) {
                    const imageUrl = card.image.large;
                    if (!imageUrl) {
                        throw new Error('Image url not found in the JSON response');
                    }
            
                    const filepath = getFilePathsByImageName(imageUrl, language);
                    
                    if(!checkIfFolderExists(filepath.cardImages)) {
                        const imageData = await downloadImage(imageUrl);
                        const imageBuffer = await resizeImage(imageData);
                        await saveCardImage(imageBuffer, filepath.cardImages);
                        await combineImages(imageBuffer, filepath.cardSquares);
                    }
                }

                console.log(`Finished batch number: ${batchNumber++}`);
            } while (data.next !== null);
            console.log(`------------------------ Finished ${localeDictionary[language]} language ------------------------`)
        } catch (error) {
            console.error('Error: ', error);
        }
    }
}

main();


