import { load } from 'cheerio';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { formatLevel } from './utils/formatters.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DIGIMON_CARD_GAME_CARDLIST_BASE_URL =
	'https://world.digimoncard.com/cardlist';
enum SetIds {
	SPECIAL_BOOSTER_VER_2 = '522025',
}
const SetNames = Object.fromEntries(
	Object.entries(SetIds).map(([key, value]) => [value, key]),
);
enum CardTypes {
	DIGI_EGG = 'Digi-Egg',
	DIGIMON = 'Digimon',
	TAMER = 'Tamer',
	OPTION = 'Option',
}
type CardColors =
	| 'Red'
	| 'Blue'
	| 'Yellow'
	| 'Green'
	| 'Black'
	| 'Purple'
	| 'White';

const allowedCardColors: CardColors[] = [
	'Red',
	'Blue',
	'Yellow',
	'Green',
	'Black',
	'Purple',
	'White',
];

interface BaseCard {
	id: string;
	name: string;
	colors: CardColors[];
	isAlternateArt?: boolean;
}

interface DigiEggCard extends BaseCard {
	type: CardTypes.DIGI_EGG;
	level: '2';
}

interface DigimonCard extends BaseCard {
	type: CardTypes.DIGIMON;
	level: string;
	playCost: string;
	dp: string;
}

interface TamerCard extends BaseCard {
	type: CardTypes.TAMER;
	playCost: string;
}

interface OptionCard extends BaseCard {
	type: CardTypes.OPTION;
	useCost: string;
}

type Card = DigiEggCard | DigimonCard | TamerCard | OptionCard;

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
		const results: Card[] = [];

		cardListItems.each((_, item) => {
			const cardId = $(item).find('.cardno').text().trim();
			const cardName = $(item).find('.card_name').text().trim();
			const cardType = $(item).find('.cardtype').first().text().trim();
			const cardColors = $(item)
				.find('.cardColor')
				.children()
				.map((_, color) => {
					const colorText = $(color).text().trim();
					if (!allowedCardColors.includes(colorText as CardColors)) {
						console.warn(
							`Unknown card color: ${colorText} for card ${cardName} (${cardId})`,
						);
						return null;
					}
					return colorText;
				})
				.get()
				.filter((c): c is CardColors => c !== null);
			const isAlternateArt = $(item).find('.cardParallel').length > 0;
			const playCost = $(item)
				.find('dt')
				.filter((_, el) => $(el).text().trim() === 'Play Cost')
				.next('dd')
				.text()
				.trim();

			switch (cardType) {
				case CardTypes.DIGI_EGG:
					results.push({
						id: cardId,
						name: cardName,
						type: CardTypes.DIGI_EGG,
						level: '2',
						colors: cardColors,
						isAlternateArt,
					});
					break;
				case CardTypes.DIGIMON:
					const level = $(item).find('.cardlv').text().trim();
					const dp = $(item).find('.cardinfo_dp > dd').text().trim();
					results.push({
						id: cardId,
						name: cardName,
						type: CardTypes.DIGIMON,
						level: formatLevel(level),
						playCost: playCost,
						dp,
						colors: cardColors,
						isAlternateArt,
					});
					break;
				case CardTypes.TAMER:
					results.push({
						id: cardId,
						name: cardName,
						type: CardTypes.TAMER,
						playCost: playCost,
						colors: cardColors,
						isAlternateArt,
					});
					break;
				case CardTypes.OPTION:
					results.push({
						id: cardId,
						name: cardName,
						type: CardTypes.OPTION,
						useCost: playCost,
						colors: cardColors,
						isAlternateArt,
					});
					break;
				default:
					console.warn(
						`Unknown card type: ${cardType} for card ${cardName} (${cardId})`,
					);
					break;
			}
		});
		console.log(`Scraped ${results.length} cards from set ${SetNames[setId]}.`);
		return results;
	} catch (e) {
		console.log(e);
		throw e;
	}
};

const scrapeAllSets = async () => {
	const allResults: Record<string, Card[]> = {};

	for (const [setName, setId] of Object.entries(SetIds)) {
		allResults[setName] = await scrapeSet(setId);
	}

	const outputFile = path.join(__dirname, 'cardlist.json');
	fs.writeFileSync(outputFile, JSON.stringify(allResults, null, 2));

	console.log(`Scraped data saved to ${outputFile}`);

	return allResults;
};

scrapeAllSets();
