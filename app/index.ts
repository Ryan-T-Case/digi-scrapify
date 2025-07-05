import { load } from 'cheerio';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DIGIMON_CARD_GAME_CARDLIST_BASE_URL =
	'https://world.digimoncard.com/cardlist';
enum SetIds {
	SPECIAL_BOOSTER_VER_2 = '522025',
}
const SetNames = Object.fromEntries(
	Object.entries(SetIds).map(([key, value]) => [value, key]),
);

type CardDetails = {
	id: string;
	name: string;
};

const scrapeSet = async (setId: SetIds) => {
	try {
		const res = await fetch(
			`${DIGIMON_CARD_GAME_CARDLIST_BASE_URL}/?search=true&category=${setId}`,
		);

		console.log(`Scraping set ${SetNames[setId]}...`);

		const htmlString = await res.text();
		const $ = load(htmlString);

		const cardListItems = $(
			'.cardlistCol > .image_lists > li.image_lists_item.data > .popup > .card_detail',
		);
		const results: CardDetails[] = [];

		cardListItems.each((_, item) => {
			const cardId = $(item).find('.cardno').text().trim();
			const cardName = $(item).find('.card_name').text().trim();

			results.push({
				id: cardId,
				name: cardName,
			});
		});

		return results;
	} catch (e) {
		console.log(e);
		throw e;
	}
};

const scrapeAllSets = async () => {
	const allResults: Record<string, CardDetails[]> = {};

	for (const [setName, setId] of Object.entries(SetIds)) {
		allResults[setName] = await scrapeSet(setId);
	}

	const outputFile = path.join(__dirname, 'cardlist.json');
	fs.writeFileSync(outputFile, JSON.stringify(allResults, null, 2));

	console.log(`Scraped data saved to ${outputFile}`);

	return allResults;
};

scrapeAllSets();
