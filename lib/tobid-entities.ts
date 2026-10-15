export interface B2GCompanyInfo {
  symbol: string;
  name: string;
  legalName: string;
  sector: 'defense' | 'it_software' | 'heavy_electric_engineering' | 'green_energy';
  sectorLabel: string;
  aliases?: string[];
}

export const B2G_COMPANIES: B2GCompanyInfo[] = [
  // 1. 國防與航太軍工
  {
    symbol: '2634',
    name: '漢翔',
    legalName: '漢翔航空工業股份有限公司',
    sector: 'defense',
    sectorLabel: '國防航太軍工',
    aliases: ['漢翔航空', 'AIDC'],
  },
  {
    symbol: '6753',
    name: '龍德造船',
    legalName: '龍德造船工業股份有限公司',
    sector: 'defense',
    sectorLabel: '國防航太軍工',
    aliases: ['龍德'],
  },
  {
    symbol: '8033',
    name: '雷虎',
    legalName: '雷虎科技股份有限公司',
    sector: 'defense',
    sectorLabel: '國防航太軍工',
    aliases: ['雷虎科技'],
  },
  {
    symbol: '2630',
    name: '亞航',
    legalName: '亞洲航空股份有限公司',
    sector: 'defense',
    sectorLabel: '國防航太軍工',
    aliases: ['亞洲航空'],
  },
  {
    symbol: '5222',
    name: '全訊',
    legalName: '全訊科技股份有限公司',
    sector: 'defense',
    sectorLabel: '國防航太軍工',
    aliases: ['全訊科技'],
  },

  // 2. 資訊軟體 / 雲端 / 資安
  {
    symbol: '6214',
    name: '精誠',
    legalName: '精誠資訊股份有限公司',
    sector: 'it_software',
    sectorLabel: '資訊軟體與雲端資安',
    aliases: ['精誠資訊', 'Systex'],
  },
  {
    symbol: '3029',
    name: '零壹',
    legalName: '零壹科技股份有限公司',
    sector: 'it_software',
    sectorLabel: '資訊軟體與雲端資安',
    aliases: ['零壹科技', 'Zero One'],
  },
  {
    symbol: '6112',
    name: '邁達特',
    legalName: '邁達特數位股份有限公司',
    sector: 'it_software',
    sectorLabel: '資訊軟體與雲端資安',
    aliases: ['邁達特', '聚碩', 'MetaAge'],
  },
  {
    symbol: '2453',
    name: '凌群',
    legalName: '凌群電腦股份有限公司',
    sector: 'it_software',
    sectorLabel: '資訊軟體與雲端資安',
    aliases: ['凌群電腦', 'Syscom'],
  },
  {
    symbol: '2471',
    name: '資通',
    legalName: '資通電腦股份有限公司',
    sector: 'it_software',
    sectorLabel: '資訊軟體與雲端資安',
    aliases: ['資通電腦', 'Ares'],
  },
  {
    symbol: '6690',
    name: '安碁資訊',
    legalName: '安碁資訊股份有限公司',
    sector: 'it_software',
    sectorLabel: '資訊軟體與雲端資安',
    aliases: ['安碁', 'ACSI'],
  },
  {
    symbol: '6752',
    name: '叡揚',
    legalName: '叡揚資訊股份有限公司',
    sector: 'it_software',
    sectorLabel: '資訊軟體與雲端資安',
    aliases: ['叡揚資訊', 'Galaxy Software'],
  },
  {
    symbol: '2474',
    name: '敦陽科',
    legalName: '敦陽科技股份有限公司',
    sector: 'it_software',
    sectorLabel: '資訊軟體與雲端資安',
    aliases: ['敦陽', '敦陽科技'],
  },
  {
    symbol: '6811',
    name: '宏碁資訊',
    legalName: '宏碁資訊服務股份有限公司',
    sector: 'it_software',
    sectorLabel: '資訊軟體與雲端資安',
    aliases: ['AEB', '宏碁資服'],
  },
  {
    symbol: '8099',
    name: '大世科',
    legalName: '大同世界科技股份有限公司',
    sector: 'it_software',
    sectorLabel: '資訊軟體與雲端資安',
    aliases: ['大同世界科技', 'TSTI'],
  },

  // 3. 重電 / 公共工程 / 水資源
  {
    symbol: '9933',
    name: '中鼎',
    legalName: '中鼎工程股份有限公司',
    sector: 'heavy_electric_engineering',
    sectorLabel: '重電工程與水資源',
    aliases: ['中鼎工程', 'CTCI'],
  },
  {
    symbol: '3703',
    name: '欣陸',
    legalName: '欣陸投資控股股份有限公司',
    sector: 'heavy_electric_engineering',
    sectorLabel: '重電工程與水資源',
    aliases: ['大陸工程', '欣陸投控'],
  },
  {
    symbol: '5521',
    name: '工信',
    legalName: '工信工程股份有限公司',
    sector: 'heavy_electric_engineering',
    sectorLabel: '重電工程與水資源',
    aliases: ['工信工程'],
  },
  {
    symbol: '8473',
    name: '山林水',
    legalName: '山林水環境工程股份有限公司',
    sector: 'heavy_electric_engineering',
    sectorLabel: '重電工程與水資源',
    aliases: ['山林水環境'],
  },
  {
    symbol: '8936',
    name: '國統',
    legalName: '國統國際股份有限公司',
    sector: 'heavy_electric_engineering',
    sectorLabel: '重電工程與水資源',
    aliases: ['國統國際'],
  },
  {
    symbol: '1519',
    name: '華城',
    legalName: '華城電機股份有限公司',
    sector: 'heavy_electric_engineering',
    sectorLabel: '重電工程與水資源',
    aliases: ['華城電機'],
  },
  {
    symbol: '1503',
    name: '士電',
    legalName: '士林電機廠股份有限公司',
    sector: 'heavy_electric_engineering',
    sectorLabel: '重電工程與水資源',
    aliases: ['士林電機'],
  },
  {
    symbol: '1513',
    name: '中興電',
    legalName: '中興電工機械股份有限公司',
    sector: 'heavy_electric_engineering',
    sectorLabel: '重電工程與水資源',
    aliases: ['中興電工'],
  },
  {
    symbol: '1514',
    name: '亞力',
    legalName: '亞力電機股份有限公司',
    sector: 'heavy_electric_engineering',
    sectorLabel: '重電工程與水資源',
    aliases: ['亞力電機'],
  },
  {
    symbol: '2535',
    name: '達欣工',
    legalName: '達欣工程股份有限公司',
    sector: 'heavy_electric_engineering',
    sectorLabel: '重電工程與水資源',
    aliases: ['達欣工程'],
  },

  // 4. 綠能與儲能特許標案
  {
    symbol: '6873',
    name: '泓德能源',
    legalName: '泓德能源科技股份有限公司',
    sector: 'green_energy',
    sectorLabel: '綠能與儲能特許',
    aliases: ['泓德'],
  },
  {
    symbol: '6869',
    name: '雲豹能源',
    legalName: '雲豹能源科技股份有限公司',
    sector: 'green_energy',
    sectorLabel: '綠能與儲能特許',
    aliases: ['雲豹'],
  },
  {
    symbol: '6806',
    name: '森崴能源',
    legalName: '森崴能源股份有限公司',
    sector: 'green_energy',
    sectorLabel: '綠能與儲能特許',
    aliases: ['森崴'],
  },
  {
    symbol: '6803',
    name: '崑鼎',
    legalName: '崑鼎綠能環保股份有限公司',
    sector: 'green_energy',
    sectorLabel: '綠能與儲能特許',
    aliases: ['崑鼎綠能'],
  },
  {
    symbol: '8422',
    name: '可寧衛',
    legalName: '可寧衛股份有限公司',
    sector: 'green_energy',
    sectorLabel: '綠能與儲能特許',
    aliases: ['可寧衛環保'],
  },
];

/**
 * 根據股票代號、中文簡稱或別名尋找預定義的 B2G 上市櫃公司資訊
 */
export function findB2GEntity(query: string): B2GCompanyInfo | null {
  if (!query) return null;
  const clean = query.trim().toUpperCase().replace(/^(TW:|TWO:|TPE:|\.TW|\.TWO)/i, '');
  const digitsMatch = clean.match(/\d{4}/);
  const ticker = digitsMatch ? digitsMatch[0] : '';

  for (const comp of B2G_COMPANIES) {
    if (ticker && comp.symbol === ticker) {
      return comp;
    }
    if (clean === comp.symbol) {
      return comp;
    }
    if (query.includes(comp.name) || clean.includes(comp.name)) {
      return comp;
    }
    if (query.includes(comp.legalName) || comp.legalName.includes(query)) {
      return comp;
    }
    if (comp.aliases?.some((alias) => query.includes(alias) || clean.includes(alias.toUpperCase()))) {
      return comp;
    }
  }

  return null;
}
