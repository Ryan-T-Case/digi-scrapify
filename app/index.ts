import { load } from 'cheerio';

const DIGIMON_CARD_GAME_CARDLIST_BASE_URL =
  'https://world.digimoncard.com/cardlist';
enum SetIds {
  SPECIAL_BOOSTER_VER_2 = '522025',
}

const scrape = async () => {
  try {
    const res = await fetch(
      `${DIGIMON_CARD_GAME_CARDLIST_BASE_URL}/?search=true&category=${SetIds.SPECIAL_BOOSTER_VER_2}`,
    );
    const htmlString = await res.text();
    const $ = load(htmlString);

    console.log(
      $(
        '.cardlistCol > .image_lists > li.image_lists_item.data > .popup > .card_detail .card_name',
      ).text(),
    );
  } catch (e) {
    console.log(e);
    throw e;
  }
};

scrape();
