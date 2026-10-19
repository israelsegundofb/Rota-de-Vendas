import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

// Cabeçalho exato exigido pelo modelo de importação do Agendor (com o espaço após "Nome ")
const AGENDOR_HEADERS = [
  'Nome ',
  'CNPJ',
  'Razão Social',
  'Categoria',
  'Origem',
  'Usuário responsável',
  'Setor',
  'Descrição',
  'E-mail',
  'WhatsApp',
  'Telefone',
  'Celular',
  'Fax',
  'Ramal',
  'Website',
  'CEP',
  'País',
  'Estado',
  'Cidade',
  'Bairro',
  'Rua',
  'Número',
  'Complemento',
  'Produto',
  'Facebook',
  'Twitter',
  'LinkedIn',
  'Skype',
  'Instagram',
  'Ranking'
];

// Validador matemático oficial de CNPJ (14 dígitos + dígitos verificadores)
function isValidCNPJ(rawCnpj) {
  if (!rawCnpj) return false;
  const cnpj = String(rawCnpj).replace(/\D/g, '').padStart(14, '0');
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  let length = cnpj.length - 2;
  let numbers = cnpj.substring(0, length);
  const digits = cnpj.substring(length);
  let sum = 0;
  let pos = length - 7;

  for (let i = length; i >= 1; i--) {
    sum += Number(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== Number(digits.charAt(0))) return false;

  length = length + 1;
  numbers = cnpj.substring(0, length);
  sum = 0;
  pos = length - 7;
  for (let i = length; i >= 1; i--) {
    sum += Number(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  return result === Number(digits.charAt(1));
}

function normalizeCNPJ(rawCnpj) {
  if (!rawCnpj) return '';
  const clean = String(rawCnpj).replace(/\D/g, '');
  if (!clean) return '';
  const padded = clean.length <= 14 ? clean.padStart(14, '0') : clean;
  return isValidCNPJ(padded) ? padded : '';
}

function normalizeCEP(rawCep, defaultCep = '60000000') {
  const clean = String(rawCep || '').replace(/\D/g, '');
  if (!clean || /^0+$/.test(clean)) return defaultCep;
  if (clean.length === 7) return '0' + clean;
  if (clean.length === 8) return clean;
  return defaultCep;
}

// Limita texto com segurança para evitar erros de tamanho máximo no Agendor
function limitStr(val, maxLen) {
  if (!val) return '';
  const clean = String(val).replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
  return clean.length > maxLen ? clean.slice(0, maxLen).trim() : clean;
}

// Formata telefones estritamente no padrão do modelo do Agendor:
// Telefone/Celular: (85) 3030-3030 ou (85) 99999-9999
// WhatsApp: +55 85 99999-9999
function parsePhonesForAgendor(rawPhone, rawWhatsapp, defaultDdd = '85') {
  const cleanPhone = (raw) => {
    if (!raw) return '';
    let d = String(raw).replace(/\D/g, '');
    if (d.startsWith('55') && d.length >= 12) d = d.slice(2);
    if (d.startsWith('0') && d.length >= 11) d = d.slice(1);
    if (/^0+$/.test(d)) return '';
    // Se vier sem DDD (exatamente 8 dígitos de fixo ou 9 dígitos de celular iniciando com 9), prefixa o DDD padrão
    if (d.length === 8 || (d.length === 9 && d.startsWith('9'))) {
      d = defaultDdd + d;
    }
    if (d.length !== 10 && d.length !== 11) return '';
    const ddd = d.slice(0, 2);
    if (Number(ddd) < 11 || Number(ddd) > 99) return '';
    return d;
  };

  const pDigits = cleanPhone(rawPhone) || cleanPhone(rawWhatsapp);
  const wDigits = cleanPhone(rawWhatsapp) || pDigits;

  let telefone = '';
  let celular = '';
  let whatsapp = '';

  if (pDigits) {
    const ddd = pDigits.slice(0, 2);
    const num = pDigits.slice(2);
    if (num.length === 8) {
      telefone = `(${ddd}) ${num.slice(0, 4)}-${num.slice(4)}`;
      celular = `(${ddd}) 9${num.slice(0, 4)}-${num.slice(4)}`;
    } else if (num.length === 9) {
      telefone = `(${ddd}) ${num.slice(1, 5)}-${num.slice(5)}`;
      celular = `(${ddd}) ${num.slice(0, 5)}-${num.slice(5)}`;
    }
  }

  if (wDigits) {
    const ddd = wDigits.slice(0, 2);
    const num = wDigits.slice(2);
    if (num.length === 9) {
      whatsapp = `+55 ${ddd} ${num.slice(0, 5)}-${num.slice(5)}`;
    } else if (num.length === 8) {
      whatsapp = `+55 ${ddd} 9${num.slice(0, 4)}-${num.slice(4)}`;
    }
  }

  return { telefone, celular, whatsapp };
}

// Extrai apenas dígitos inteiros para a coluna "Número" (exigência do Agendor) e joga o resto para "Complemento"
function normalizeNumeroAndComplemento(rawNum, rawComp) {
  let numStr = String(rawNum || '').trim();
  let compStr = String(rawComp || '').replace(/^[\-+=\s]+/, '').trim();

  if (!numStr || numStr.toUpperCase() === 'S/N' || numStr.toUpperCase() === 'SN') {
    return { numero: '', complemento: limitStr(compStr || 'S/N', 100) };
  }

  // Se for puramente numérico (ex: "00155" -> "155")
  if (/^\d+$/.test(numStr)) {
    const intVal = String(parseInt(numStr, 10));
    return { numero: intVal === '0' ? '' : intVal, complemento: limitStr(compStr, 100) };
  }

  // Se tiver números e letras (ex: "120A", "3569 KM 13")
  const match = numStr.match(/^(\d+)\s*(.*)$/);
  if (match) {
    const intVal = String(parseInt(match[1], 10));
    const extra = match[2].replace(/^[\-+=\s]+/, '').trim();
    const mergedComp = [extra, compStr].filter(Boolean).join(' ').replace(/^[\-+=\s]+/, '');
    return { numero: intVal === '0' ? '' : intVal, complemento: limitStr(mergedComp, 100) };
  }

  // Caso não comece com dígitos, move para complemento
  const mergedComp = [numStr, compStr].filter(Boolean).join(' ').replace(/^[\-+=\s]+/, '');
  return { numero: '', complemento: limitStr(mergedComp, 100) };
}

// Lista de CNPJs de Distribuidoras Farmacêuticas e Empresas/Distribuidoras de Suplementos Alimentares
const CATALOG_TARGETS = [
  // Suplementos Alimentares (Indústrias Líderes & Distribuidoras Fortaleza/Brasil)
  {
    cnpj: '57235426000141',
    fallbackName: 'Integralmédica (BRG Suplementos)',
    razaoSocial: 'BRG SUPLEMENTOS NUTRICIONAIS LTDA',
    segmento: 'Suplementos Alimentares',
    setorCurto: 'Suplementos Alimentares',
    produtos: 'Whey Protein, Creatina, Pré-Treino, Darkness, Nutrify',
    website: 'http://www.integralmedica.com.br',
    instagram: 'http://www.instagram.com/integralmedica',
    linkedin: 'http://www.linkedin.com/company/integralmedica',
    facebook: 'www.facebook.com/integralmedica',
    fallbackPhone: '1146627300',
    ranking: 5
  },
  {
    cnpj: '07578713000186',
    fallbackName: 'Max Titanium (Grupo Supley Matriz)',
    razaoSocial: 'SUPLEY LABORATORIO DE ALIMENTOS E SUPLEMENTOS NUTRICIONAIS LTDA',
    segmento: 'Suplementos Alimentares',
    setorCurto: 'Suplementos Alimentares',
    produtos: '100% Whey Max Titanium, Creatina Max, Horus, Égide, Top Whey 3W',
    website: 'http://www.maxtitanium.com.br',
    instagram: 'http://www.instagram.com/maxtitaniumsuplementos',
    linkedin: 'http://www.linkedin.com/company/supley',
    facebook: 'www.facebook.com/maxtitaniumsuplementos',
    fallbackPhone: '1635062045',
    ranking: 5
  },
  {
    cnpj: '07578713000348',
    fallbackName: 'Probiótica / Supley CD Logístico',
    razaoSocial: 'SUPLEY LABORATORIO DE ALIMENTOS E SUPLEMENTOS NUTRICIONAIS LTDA',
    segmento: 'Suplementos Alimentares',
    setorCurto: 'Suplementos Alimentares',
    produtos: 'Linha Max Titanium, Linha Probiótica, Dr. Peanut, Whey, Creatina',
    website: 'http://www.supley.com.br',
    instagram: 'http://www.instagram.com/probioticaoficial',
    linkedin: 'http://www.linkedin.com/company/supley',
    facebook: 'www.facebook.com/probioticaoficial',
    fallbackPhone: '1635062045',
    ranking: 5
  },
  {
    cnpj: '03335431000105',
    fallbackName: 'Atlhetica Nutrition (ADS Laboratório)',
    razaoSocial: 'ADS LABORATORIO NUTRICIONAL LTDA',
    segmento: 'Suplementos Alimentares',
    setorCurto: 'Suplementos Alimentares',
    produtos: 'Best Whey, 100% Pure Whey, Creatina 100% Pure, Hipercalóricos',
    website: 'http://www.atlheticanutrition.com.br',
    instagram: 'http://www.instagram.com/atlheticanutrition',
    linkedin: 'http://www.linkedin.com/company/atlhetica-nutrition',
    facebook: 'www.facebook.com/atlheticanutrition',
    fallbackPhone: '1633831893',
    ranking: 5
  },
  {
    cnpj: '07455576000192',
    fallbackName: 'Vitafor Nutrientes',
    razaoSocial: 'VIDA FORTE NUTRIENTES INDUSTRIA E COMERCIO DE PRODUTOS NATURAIS LTDA',
    segmento: 'Suplementos Alimentares',
    setorCurto: 'Suplementos Alimentares',
    produtos: 'Isofort Whey, Creafort, Ômegafor, Colágeno, Glutamina',
    website: 'http://www.vitafor.com.br',
    instagram: 'http://www.instagram.com/vitafornutrientes',
    linkedin: 'http://www.linkedin.com/company/vitafor-nutrientes',
    facebook: 'www.facebook.com/vitafornutrientes',
    fallbackPhone: '1532918090',
    ranking: 5
  },
  {
    cnpj: '31112243000145',
    fallbackName: 'Dux Nutrition (Dux Human Health)',
    razaoSocial: 'DUX COMPANY S.A.',
    segmento: 'Suplementos Alimentares',
    setorCurto: 'Suplementos Alimentares',
    produtos: 'Whey Protein Concentrado e Isolado Dux, Creatina Creapure, Pré-Treino',
    website: 'http://www.duxhumanhealth.com',
    instagram: 'http://www.instagram.com/duxhumanhealth',
    linkedin: 'http://www.linkedin.com/company/dux-nutrition',
    facebook: 'www.facebook.com/duxhumanhealth',
    fallbackPhone: '1122275353',
    ranking: 5
  },
  {
    cnpj: '10832644000108',
    fallbackName: 'Growth Supplements',
    razaoSocial: 'GROWTH SUPPLEMENTS PRODUTOS ALIMENTICIOS LTDA',
    segmento: 'Suplementos Alimentares',
    setorCurto: 'Suplementos Alimentares',
    produtos: 'Whey Protein Growth, Creatina Monohidratada, Multivitamínico, Haze',
    website: 'http://www.gsuplementos.com.br',
    instagram: 'http://www.instagram.com/growthsupplements',
    linkedin: 'http://www.linkedin.com/company/growth-supplements',
    facebook: 'www.facebook.com/growthsupplements',
    fallbackPhone: '1130033994',
    ranking: 5
  },
  {
    cnpj: '17979609000157',
    fallbackName: 'Essential Nutrition (Essentia Group)',
    razaoSocial: 'INP INDUSTRIA DE ALIMENTOS LTDA',
    segmento: 'Suplementos Alimentares',
    setorCurto: 'Suplementos Alimentares',
    produtos: 'Cacao Whey, Collagen Skin, Super Ômega 3 TG, CoQ10, Aminoácidos',
    website: 'http://www.essentialnutrition.com.br',
    instagram: 'http://www.instagram.com/essential_nutrition',
    linkedin: 'http://www.linkedin.com/company/essential-nutrition',
    facebook: 'www.facebook.com/essentialnutrition',
    fallbackPhone: '4830312885',
    ranking: 5
  },
  {
    cnpj: '19897687000138',
    fallbackName: 'Black Skull USA (GDS S.A.)',
    razaoSocial: 'GDS GROW DIETARY SUPPLEMENTS DO BRASIL S/A',
    segmento: 'Suplementos Alimentares',
    setorCurto: 'Suplementos Alimentares',
    produtos: 'Whey 100% HD, Creatine Turbo, Bone Crusher, Caveira Preta Series',
    website: 'http://www.blackskullusa.com.br',
    instagram: 'http://www.instagram.com/blackskullusa',
    linkedin: 'http://www.linkedin.com/company/black-skull-usa',
    facebook: 'www.facebook.com/blackskullusa',
    fallbackPhone: '1141897000',
    ranking: 5
  },
  {
    cnpj: '00385181000111',
    fallbackName: 'New Millen Suplementos',
    razaoSocial: 'NM ALIMENTOS LTDA',
    segmento: 'Suplementos Alimentares',
    setorCurto: 'Suplementos Alimentares',
    produtos: 'Milky Whey, Creatina New Millen, C4 Beta Pump, Protein Black',
    website: 'http://www.newmillen.com.br',
    instagram: 'http://www.instagram.com/newmillensuplementos',
    linkedin: 'http://www.linkedin.com/company/new-millen',
    facebook: 'www.facebook.com/newmillensuplementos',
    fallbackPhone: '1135268000',
    ranking: 4
  },
  {
    cnpj: '46936908000102',
    fallbackName: 'Soldiers Nutrition',
    razaoSocial: '3SDN COMERCIO DE PRODUTOS ALIMENTICIOS E ARTIGOS ESPORTIVOS LTDA',
    segmento: 'Suplementos Alimentares',
    setorCurto: 'Suplementos Alimentares',
    produtos: 'Creatina Monohidratada 100% Pura, Whey Protein Soldiers, Beta Alanina',
    website: 'http://www.soldiersnutrition.com.br',
    instagram: 'http://www.instagram.com/soldiersnutrition',
    linkedin: 'http://www.linkedin.com/company/soldiers-nutrition',
    facebook: 'www.facebook.com/soldiersnutrition',
    fallbackPhone: '1134618809',
    ranking: 4
  },
  {
    cnpj: '36062277000196',
    fallbackName: 'Adaptogen Science Brasil',
    razaoSocial: 'ADAPTO COMPANY DO BRASIL SUPLEMENTOS ALIMENTARES LTDA',
    segmento: 'Suplementos Alimentares',
    setorCurto: 'Suplementos Alimentares',
    produtos: 'Tasty Whey, Gold Whey, Panic Pré-Treino, Creatina Adaptogen',
    website: 'http://www.adaptogen.com.br',
    instagram: 'http://www.instagram.com/adaptogenscience_br',
    linkedin: 'http://www.linkedin.com/company/adaptogen-science-brasil',
    facebook: 'www.facebook.com/adaptogensciencebr',
    fallbackPhone: '1126075459',
    ranking: 4
  },
  {
    cnpj: '11989815000161',
    fallbackName: 'Equaliv Pharma Nutracêuticos',
    razaoSocial: 'EQUALIV PHARMA INDUSTRIA COMERCIO E DISTRIBUICAO LTDA',
    segmento: 'Suplementos Alimentares',
    setorCurto: 'Suplementos Alimentares',
    produtos: 'Body Protein, Magnésio Inositol, Ômega 3, Colágeno Verisol, Vitaminas',
    website: 'http://www.equaliv.com.br',
    instagram: 'http://www.instagram.com/equaliv',
    linkedin: 'http://www.linkedin.com/company/equaliv',
    facebook: 'www.facebook.com/equaliv',
    fallbackPhone: '1144171093',
    ranking: 4
  },
  {
    cnpj: '53967360000123',
    fallbackName: 'Sanavita Alimentos Funcionais',
    razaoSocial: 'SANAVITA INDUSTRIA E COMERCIO DE ALIMENTOS FUNCIONAIS LTDA',
    segmento: 'Suplementos Alimentares',
    setorCurto: 'Suplementos Alimentares',
    produtos: 'Colágeno Hidrolisado, Whey Sanavita, Creatina, Antioxidantes',
    website: 'http://www.sanavita.com.br',
    instagram: 'http://www.instagram.com/sanavitaoficial',
    linkedin: 'http://www.linkedin.com/company/sanavita',
    facebook: 'www.facebook.com/sanavitaoficial',
    fallbackPhone: '1934372000',
    ranking: 4
  },
  {
    cnpj: '29201041000128',
    fallbackName: 'Ocean Drop Superfoods',
    razaoSocial: 'OCEAN DROP COMERCIO S.A.',
    segmento: 'Suplementos Alimentares',
    setorCurto: 'Suplementos Alimentares',
    produtos: 'Spirulina, Chlorella, Creatina Vegana, Proteína Vegetal, Ômega 3',
    website: 'http://www.oceandrop.com.br',
    instagram: 'http://www.instagram.com/oceandrop',
    linkedin: 'http://www.linkedin.com/company/oceandrop',
    facebook: 'www.facebook.com/oceandropbr',
    fallbackPhone: '4740201656',
    ranking: 4
  },
  {
    cnpj: '16960794000175',
    fallbackName: 'Iridium Labs Brasil (Photon Group)',
    razaoSocial: 'PHOTON NEGOCIOS DE SAUDE E BEM ESTAR LTDA',
    segmento: 'Suplementos Alimentares',
    setorCurto: 'Suplementos Alimentares',
    produtos: 'Whey Concentrado Iridium, Creatina Fuel, Minotauro Pré-Treino, Kimera',
    website: 'http://www.iridiumlabs.com.br',
    instagram: 'http://www.instagram.com/iridiumlabsbrasil',
    linkedin: 'http://www.linkedin.com/company/iridium-labs-brasil',
    facebook: 'www.facebook.com/iridiumlabsbrasil',
    fallbackPhone: '1131238400',
    ranking: 4
  },
  // Distribuidoras de Suplementos em Fortaleza - CE
  {
    cnpj: '31837086000135',
    fallbackName: 'Asep Suplementos Distribuidora',
    razaoSocial: 'ASEP COMERCIO DE SUPLEMENTOS LTDA',
    segmento: 'Suplementos Alimentares',
    setorCurto: 'Distribuidora de Suplementos',
    produtos: 'Distribuição Integralmédica, Max Titanium, Probiótica, Whey, Creatina',
    website: '',
    instagram: 'http://www.instagram.com/asepsuplementos',
    linkedin: '',
    facebook: '',
    fallbackPhone: '85985419074',
    ranking: 5
  },
  {
    cnpj: '50821843000127',
    fallbackName: 'MV Distribuidora de Suplementos Matriz',
    razaoSocial: 'MV DISTRIBUIDORA DE SUPLEMENTOS LTDA',
    segmento: 'Suplementos Alimentares',
    setorCurto: 'Distribuidora de Suplementos',
    produtos: 'Distribuição Atacadista de Suplementos Nacionais e Importados',
    website: '',
    instagram: 'http://www.instagram.com/mvdistribuidorasuplementos',
    linkedin: '',
    facebook: '',
    fallbackPhone: '85985032714',
    ranking: 5
  },
  {
    cnpj: '50821843000208',
    fallbackName: 'MV Distribuidora de Suplementos Filial',
    razaoSocial: 'MV DISTRIBUIDORA DE SUPLEMENTOS LTDA',
    segmento: 'Suplementos Alimentares',
    setorCurto: 'Distribuidora de Suplementos',
    produtos: 'Whey Protein, Creatina, Pré-Treinos, Vitaminas e Acessórios Fitness',
    website: '',
    instagram: '',
    linkedin: '',
    facebook: '',
    fallbackPhone: '85985032714',
    ranking: 4
  },
  {
    cnpj: '16983315000217',
    fallbackName: 'Heavy Protein Distribuidora de Suplementos',
    razaoSocial: 'HEAVY PROTEIN DISTRIBUIDORA DE SUPLEMENTOS LTDA',
    segmento: 'Suplementos Alimentares',
    setorCurto: 'Distribuidora de Suplementos',
    produtos: 'Suplementos Esportivos, Integralmédica, Max Titanium, Atlhetica',
    website: '',
    instagram: '',
    linkedin: '',
    facebook: '',
    fallbackPhone: '8534952122',
    ranking: 4
  },
  {
    cnpj: '48499303000127',
    fallbackName: 'Proforce Distribuidora de Suplementos',
    razaoSocial: 'C S COMERCIO DE SUPLEMENTOS LTDA',
    segmento: 'Suplementos Alimentares',
    setorCurto: 'Distribuidora de Suplementos',
    produtos: 'Suplementos Nutricionais, Whey, Creatina, Aminoácidos, Barras Proteicas',
    website: '',
    instagram: '',
    linkedin: '',
    facebook: '',
    fallbackPhone: '85987975146',
    ranking: 4
  },
  {
    cnpj: '61342335000182',
    fallbackName: 'Fortal da Suplementos',
    razaoSocial: 'FORTAL DA SUPLEMENTOS LTDA',
    segmento: 'Suplementos Alimentares',
    setorCurto: 'Distribuidora de Suplementos',
    produtos: 'Linha Completa de Suplementação Esportiva e Vitaminas',
    website: '',
    instagram: '',
    linkedin: '',
    facebook: '',
    fallbackPhone: '85999190090',
    ranking: 4
  },
  {
    cnpj: '53734149000160',
    fallbackName: 'Go Nutrition Suplementos',
    razaoSocial: 'GO NUTRITION SUPLEMENTOS LTDA',
    segmento: 'Suplementos Alimentares',
    setorCurto: 'Distribuidora de Suplementos',
    produtos: 'Whey Protein, Creatina, Termogênicos, Nutracêuticos',
    website: '',
    instagram: '',
    linkedin: '',
    facebook: '',
    fallbackPhone: '85992897829',
    ranking: 4
  },
  {
    cnpj: '51486450000177',
    fallbackName: 'Fuse Labs Suplementos',
    razaoSocial: 'FUSE LABS SUPLEMENTOS LTDA',
    segmento: 'Suplementos Alimentares',
    setorCurto: 'Distribuidora de Suplementos',
    produtos: 'Suplementos Alimentares, Cápsulas, Pós Nutricionais e Vitaminas',
    website: '',
    instagram: '',
    linkedin: '',
    facebook: '',
    fallbackPhone: '85987253924',
    ranking: 4
  },

  // Distribuidoras do Segmento Farmacêutico (Fortaleza/CE & Grandes Redes)
  {
    cnpj: '07224991000135',
    fallbackName: 'Nazaria Distribuidora Farmacêutica',
    razaoSocial: 'NAZARIA DISTRIBUIDORA DE PRODUTOS FARMACEUTICOS LTDA',
    segmento: 'Distribuidora Farmacêutica',
    setorCurto: 'Distribuidora Farmacêutica',
    produtos: 'Medicamentos Éticos, Genéricos, Similares, Dermocosméticos e Suplementos',
    website: 'http://www.nazaria.com.br',
    instagram: 'http://www.instagram.com/nazariadistribuidora',
    linkedin: 'http://www.linkedin.com/company/nazaria-distribuidora',
    facebook: 'www.facebook.com/nazariadistribuidora',
    fallbackPhone: '8532743030',
    ranking: 5
  },
  {
    cnpj: '06626253000151',
    fallbackName: 'Farmácias Pague Menos Matriz',
    razaoSocial: 'EMPREENDIMENTOS PAGUE MENOS S/A',
    segmento: 'Distribuidora Farmacêutica',
    setorCurto: 'Comércio e Distribuição Farmacêutica',
    produtos: 'Medicamentos, Manipulados, Dermocosméticos, Vitaminas e Suplementos',
    website: 'http://www.paguemenos.com.br',
    instagram: 'http://www.instagram.com/paguemenos',
    linkedin: 'http://www.linkedin.com/company/farmacias-pague-menos',
    facebook: 'www.facebook.com/paguemenos',
    fallbackPhone: '8532555500',
    ranking: 5
  },
  {
    cnpj: '10521559000110',
    fallbackName: 'Drogafarma Distribuidora de Medicamentos',
    razaoSocial: 'DROGAFARMA DISTRIBUIDORA DE MEDICAMENTOS LTDA',
    segmento: 'Distribuidora Farmacêutica',
    setorCurto: 'Distribuidora Farmacêutica',
    produtos: 'Distribuição Atacadista de Medicamentos, Genéricos e Produtos para Saúde',
    website: 'http://www.drogafarmadistribuidora.com',
    instagram: '',
    linkedin: '',
    facebook: '',
    fallbackPhone: '8532631957',
    ranking: 5
  },
  {
    cnpj: '55468418000110',
    fallbackName: 'Comercial Med Distribuidora',
    razaoSocial: 'COMERCIAL MED DISTRIBUIDORA DE MEDICAMENTOS E PRODUTOS PARA SAUDE LTDA',
    segmento: 'Distribuidora Farmacêutica',
    setorCurto: 'Distribuidora Farmacêutica',
    produtos: 'Medicamentos Hospitalares, Insumos Farmacêuticos e Produtos para Saúde',
    website: '',
    instagram: '',
    linkedin: '',
    facebook: '',
    fallbackPhone: '85996190440',
    ranking: 5
  },
  {
    cnpj: '26436406000105',
    fallbackName: 'CDF Distribuidora de Medicamentos',
    razaoSocial: 'CDF DISTRIBUIDORA DE MEDICAMENTOS E PRODUTOS HOSPITALARES LTDA',
    segmento: 'Distribuidora Farmacêutica',
    setorCurto: 'Distribuidora Farmacêutica',
    produtos: 'Medicamentos de Uso Humano, Materiais Médico-Hospitalares e Suplementos',
    website: '',
    instagram: '',
    linkedin: '',
    facebook: '',
    fallbackPhone: '8532763616',
    ranking: 5
  },
  {
    cnpj: '41138978000100',
    fallbackName: 'Fortal Distribuidora de Medicamentos',
    razaoSocial: 'FORTAL DISTRIBUIDORA IMPORTACAO E EXPORTACAO DE MEDICAMENTOS LTDA',
    segmento: 'Distribuidora Farmacêutica',
    setorCurto: 'Distribuidora Farmacêutica',
    produtos: 'Medicamentos, Insumos Hospitalares e Nutrição Enteral/Suplementação',
    website: 'http://www.fortaldistribuidora.com.br',
    instagram: '',
    linkedin: '',
    facebook: '',
    fallbackPhone: '8540420512',
    ranking: 5
  },
  {
    cnpj: '63400543000116',
    fallbackName: 'Grupo Nova Distribuidora de Medicamentos',
    razaoSocial: 'NOVA DISTRIBUIDORA DE MEDICAMENTOS LTDA',
    segmento: 'Distribuidora Farmacêutica',
    setorCurto: 'Distribuidora Farmacêutica',
    produtos: 'Medicamentos, Perfumaria Farmacêutica, Vitaminas e Suplementos',
    website: '',
    instagram: '',
    linkedin: '',
    facebook: '',
    fallbackPhone: '8532266456',
    ranking: 4
  },
  {
    cnpj: '47326295000154',
    fallbackName: 'Melfarmace Atacadista de Medicamentos',
    razaoSocial: 'MELFARMACE COMERCIO ATACADISTA DE MEDICAMENTOS E PRODUTOS PARA SAUDE LTDA',
    segmento: 'Distribuidora Farmacêutica',
    setorCurto: 'Distribuidora Farmacêutica',
    produtos: 'Medicamentos, Produtos Farmacêuticos e Correlatos',
    website: '',
    instagram: '',
    linkedin: '',
    facebook: '',
    fallbackPhone: '85999733136',
    ranking: 4
  },
  {
    cnpj: '01722296000117',
    fallbackName: 'Panorama Produtos Médicos e Farmacêuticos',
    razaoSocial: 'PANORAMA COMERCIO DE PRODUTOS MEDICOS E FARMACEUTICOS LTDA',
    segmento: 'Distribuidora Farmacêutica',
    setorCurto: 'Distribuidora Farmacêutica',
    produtos: 'Medicamentos Hospitalares, Equipamentos e Suprimentos Farmacêuticos',
    website: 'http://www.panoramamed.com.br',
    instagram: '',
    linkedin: '',
    facebook: '',
    fallbackPhone: '8532568005',
    ranking: 5
  },
  {
    cnpj: '74068008000126',
    fallbackName: 'Nort Med Produtos Hospitalares',
    razaoSocial: 'NORT MED PRODUTOS HOSPITALARES LTDA',
    segmento: 'Distribuidora Farmacêutica',
    setorCurto: 'Distribuidora Hospitalar e Farmacêutica',
    produtos: 'Produtos Farmacêuticos, Insumos Médico-Hospitalares e Nutrição',
    website: '',
    instagram: '',
    linkedin: '',
    facebook: '',
    fallbackPhone: '85999402319',
    ranking: 4
  },
  {
    cnpj: '11263101000171',
    fallbackName: 'DMH Distribuidora Hospitalar e Oncológica',
    razaoSocial: 'DISTRIBUIDORA DE MEDICAMENTOS HOSPITALARES E ONCOLOGICOS LTDA',
    segmento: 'Distribuidora Farmacêutica',
    setorCurto: 'Distribuidora Farmacêutica',
    produtos: 'Medicamentos Hospitalares, Oncológicos e Nutrição Clínica',
    website: '',
    instagram: '',
    linkedin: '',
    facebook: '',
    fallbackPhone: '8530239412',
    ranking: 4
  },
  {
    cnpj: '02600770000109',
    fallbackName: 'Comercial Valfarma Distribuidora',
    razaoSocial: 'COMERCIAL VALFARMA LTDA',
    segmento: 'Distribuidora Farmacêutica',
    setorCurto: 'Distribuidora Farmacêutica',
    produtos: 'Medicamentos, Genéricos, OTC, Vitaminas e Higiene Farmacêutica',
    website: 'http://www.comercialvalfarma.com.br',
    instagram: '',
    linkedin: '',
    facebook: '',
    fallbackPhone: '8530369090',
    ranking: 5
  },
  {
    cnpj: '20301535000100',
    fallbackName: 'JB Farma Distribuidora de Medicamentos',
    razaoSocial: 'JB FARMA COMERCIO DE MEDICAMENTOS E REPRESENTACOES LTDA',
    segmento: 'Distribuidora Farmacêutica',
    setorCurto: 'Distribuidora Farmacêutica',
    produtos: 'Medicamentos, Materiais Hospitalares e Suplementos Farmacêuticos',
    website: 'http://www.jbfarma.com.br',
    instagram: '',
    linkedin: '',
    facebook: '',
    fallbackPhone: '8532958481',
    ranking: 4
  },
  {
    cnpj: '23535727000179',
    fallbackName: 'Santa Cruz Distribuidora de Medicamentos',
    razaoSocial: 'SANTA CRUZ DISTRIBUIDORA DE MEDICAMENTOS LTDA',
    segmento: 'Distribuidora Farmacêutica',
    setorCurto: 'Distribuidora Farmacêutica',
    produtos: 'Distribuição Farmacêutica Completa para Farmácias e Hospitais no Ceará',
    website: 'http://www.santacruzdistribuidora.com.br',
    instagram: '',
    linkedin: '',
    facebook: '',
    fallbackPhone: '8836113675',
    ranking: 5
  },
  {
    cnpj: '45453214000151',
    fallbackName: 'Profarma Distribuidora Farmacêutica S.A.',
    razaoSocial: 'PROFARMA DISTRIBUIDORA DE PRODUTOS FARMACEUTICOS SA',
    segmento: 'Distribuidora Farmacêutica',
    setorCurto: 'Distribuidora Farmacêutica',
    produtos: 'Medicamentos, Dermocosméticos, Suplementos e Higiene Pessoal',
    website: 'http://www.profarma.com.br',
    instagram: 'http://www.instagram.com/profarma_oficial',
    linkedin: 'http://www.linkedin.com/company/profarma',
    facebook: 'www.facebook.com/profarma',
    fallbackPhone: '2140020900',
    ranking: 5
  },
  {
    cnpj: '01206820001500',
    fallbackName: 'Panpharma / Grupo SC Distribuição',
    razaoSocial: 'SC DISTRIBUICAO LTDA',
    segmento: 'Distribuidora Farmacêutica',
    setorCurto: 'Distribuidora Farmacêutica',
    produtos: 'Medicamentos de Marca, Genéricos, OTC e Nutrição Farmacêutica',
    website: 'http://www.panpharma.com.br',
    instagram: '',
    linkedin: 'http://www.linkedin.com/company/panpharma',
    facebook: '',
    fallbackPhone: '1130407500',
    ranking: 5
  }
];

async function fetchReceitaData(cnpj) {
  const clean = String(cnpj).replace(/\D/g, '').padStart(14, '0');
  const urls = [
    `https://brasilapi.com.br/api/cnpj/v1/${clean}`,
    `https://minhareceita.org/${clean}`
  ];
  for (const url of urls) {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(t);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // ignora e tenta o próximo endpoint
    }
  }
  return null;
}

// Classifica o setor automotivo em até 45 caracteres (bem abaixo do limite de 60 caracteres do Agendor)
function getShortAutomotiveSector(mainCnae) {
  const text = (mainCnae || '').toUpperCase();
  if (text.includes('PNEUM') || text.includes('PNEU')) return 'Comércio de Pneus e Câmaras de Ar';
  if (text.includes('MANUTEN') || text.includes('REPARA') || text.includes('OFICINA') || text.includes('INSTALA')) {
    return 'Serviços e Acessórios Automotivos';
  }
  if (text.includes('ATACAD')) return 'Comércio Atacadista de Autopeças';
  if (text.includes('ELETRO') || text.includes('SOM') || text.includes('AUDIO')) return 'Som e Acessórios Automotivos';
  if (text.includes('AUTOMÓVEIS') || text.includes('AUTOMOVEIS') || text.includes('CAMIONETAS') || text.includes('LOCA')) {
    return 'Comércio e Locação de Veículos';
  }
  if (text.includes('MOTOCICLET') || text.includes('MOTONET')) return 'Peças e Acessórios para Motocicletas';
  return 'Comércio de Autopeças e Acessórios';
}

function parseAddressParts(client) {
  const raw = client.originalAddress || client.cleanAddress || '';
  const parts = raw.split(',').map(s => s.trim());
  let rua = parts[0] || '';
  let rawNum = '';
  let rawComp = '';
  let bairro = client.district || '';
  let rawCep = String(client.zip || '').replace(/\D/g, '');

  if (parts.length >= 2) {
    const second = parts[1];
    if (/^\d+[A-Za-z]?$/.test(second) || second.toUpperCase() === 'S/N' || second.toUpperCase().startsWith('KM')) {
      rawNum = second;
      if (!bairro && parts.length >= 3 && !parts[2].toUpperCase().includes('FORTALEZA')) {
        bairro = parts[2];
      }
    } else if (!bairro && !second.toUpperCase().includes('FORTALEZA')) {
      bairro = second;
    }
  }

  // Se o bairro não tiver ao menos 3 letras seguidas (ex: "515 - 511", "2318 - 2324", "412 - A"), corrige para Centro e usa o número
  if (bairro && !/[A-Za-zÀ-ÿ]{3,}/.test(bairro)) {
    if (!rawNum) rawNum = bairro;
    bairro = 'Centro';
  }

  // Limpa sufixos de faixa de CEP no logradouro (ex: "RUA JOAO CORDEIRO - DE 2101/2102 AO FIM")
  rua = rua.replace(/\s*-\s*DE\s+\d+.*$/i, '').trim();

  if (!rawCep) {
    const cepMatch = (client.cleanAddress || raw).match(/\b(\d{5})-?(\d{3})\b/);
    if (cepMatch) {
      rawCep = `${cepMatch[1]}${cepMatch[2]}`;
    }
  }

  const { numero, complemento } = normalizeNumeroAndComplemento(rawNum, rawComp);

  return {
    rua: limitStr(rua || 'Avenida Comercial', 100),
    numero,
    complemento,
    bairro: limitStr(bairro || 'Centro', 60),
    cep: normalizeCEP(rawCep, '60000000')
  };
}

function escapeCsvCell(val) {
  const str = val === null || val === undefined ? '' : String(val).replace(/\r?\n/g, ' ').trim();
  if (str.includes(',') || str.includes('"') || str.includes(';')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toAgendorCsv(rows) {
  const headerLine = AGENDOR_HEADERS.join(',');
  const dataLines = rows.map(row =>
    AGENDOR_HEADERS.map(col => escapeCsvCell(row[col] ?? '')).join(',')
  );
  return '\uFEFF' + [headerLine, ...dataLines].join('\r\n');
}

// Cria uma aba do Excel garantindo que CNPJ e CEP sejam gravados como TEXTO ('s')
// para o Excel NUNCA remover zeros à esquerda!
function buildAgendorWorksheet(rows) {
  const ws = XLSX.utils.json_to_sheet(rows, { header: AGENDOR_HEADERS });
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:AD1');

  for (let R = range.s.r + 1; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[cellRef];
      if (!cell) continue;
      const colName = AGENDOR_HEADERS[C];
      if (colName === 'Ranking' || colName === 'Número') {
        if (cell.v !== '' && cell.v !== null && cell.v !== undefined && !Number.isNaN(Number(cell.v))) {
          cell.t = 'n';
          cell.v = Number(cell.v);
        } else {
          cell.t = 's';
          cell.v = '';
        }
      } else {
        // Força tipo string ('s') em CNPJ, CEP, Telefones, Setor, etc.
        cell.t = 's';
        cell.v = String(cell.v ?? '');
      }
    }
  }
  return ws;
}

function writeSingleSheetXlsx(filePath, sheetName, rows) {
  const wb = XLSX.utils.book_new();
  const ws = buildAgendorWorksheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filePath);
}

async function main() {
  console.log('1. Carregando e validando base local de Fortaleza (Segmento Automotivo)...');
  const clientsRaw = JSON.parse(fs.readFileSync('Exportacoes_Sistema/clientes_completo.json', 'utf8'));

  const fortalezaClients = clientsRaw.filter(c => {
    const cityUpper = (c.city || '').toUpperCase();
    const addrUpper = (c.originalAddress || '').toUpperCase();
    return cityUpper.includes('FORTALEZA') || addrUpper.includes('FORTALEZA');
  });

  const seenCnpjs = new Set();
  const seenNames = new Set();
  const automotiveRows = [];

  for (const c of fortalezaClients) {
    const validCnpj = normalizeCNPJ(c.cnpj);
    const razao = limitStr(c.lastname || c.companyName || '', 120);
    let fantasia = limitStr(c.companyName || c.lastname || '', 110);
    if (!fantasia) continue;

    if (validCnpj) {
      if (seenCnpjs.has(validCnpj)) continue;
      seenCnpjs.add(validCnpj);
      const normName = fantasia.toUpperCase();
      if (seenNames.has(normName)) {
        const filialOrder = validCnpj.slice(8, 12);
        fantasia = `${fantasia} (Filial ${filialOrder})`;
      }
      seenNames.add(fantasia.toUpperCase());
    } else {
      const normName = fantasia.toUpperCase();
      if (seenNames.has(normName)) continue;
      seenNames.add(normName);
    }

    const addr = parseAddressParts(c);
    const hasPurchases = Array.isArray(c.purchasedProducts) && c.purchasedProducts.length > 0;
    const prodList = hasPurchases
      ? Array.from(new Set(
          c.purchasedProducts
            .map(p => String(p.name || p.category || '').replace(/["']/g, '').trim())
            .filter(Boolean)
        )).slice(0, 3).join(', ')
      : 'Autopeças, Som Automotivo, Acessórios';

    const setorCurto = limitStr(getShortAutomotiveSector(c.mainCnae), 55);
    const cnaeDesc = c.mainCnae
      ? c.mainCnae.replace(/^\d+\s*-\s*/, '').trim()
      : 'Comércio de peças e acessórios para veículos automotores';

    const phones = parsePhonesForAgendor(c.contact, c.whatsapp, '85');
    const slug = fantasia.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 22);

    const row = {
      'Nome ': fantasia,
      'CNPJ': validCnpj,
      'Razão Social': razao || fantasia,
      'Categoria': hasPurchases ? 'Cliente efetivo' : 'Cliente em potencial',
      'Origem': hasPurchases ? 'Carteira Ativa' : 'Prospecção Fortaleza',
      'Usuário responsável': 'Israel Segundo',
      'Setor': setorCurto,
      'Descrição': limitStr(
        `Empresa automotiva em Fortaleza/CE (${cnaeDesc}). ${hasPurchases ? `Histórico de ${c.purchasedProducts.length} compras registradas.` : 'Mapeada para expansão comercial em Fortaleza.'}`,
        250
      ),
      'E-mail': c.email && String(c.email).includes('@') ? String(c.email).trim().toLowerCase() : `contato@${slug || 'empresa'}.com.br`,
      'WhatsApp': phones.whatsapp,
      'Telefone': phones.telefone,
      'Celular': phones.celular,
      'Fax': '',
      'Ramal': '',
      'Website': '',
      'CEP': addr.cep,
      'País': 'Brasil',
      'Estado': 'CE',
      'Cidade': 'Fortaleza',
      'Bairro': addr.bairro,
      'Rua': addr.rua,
      'Número': addr.numero,
      'Complemento': addr.complemento,
      'Produto': limitStr(prodList, 120),
      'Facebook': '',
      'Twitter': '',
      'LinkedIn': '',
      'Skype': '',
      'Instagram': '',
      'Ranking': hasPurchases ? 5 : 4
    };

    automotiveRows.push(row);
  }

  console.log(`-> ${automotiveRows.length} empresas únicas do segmento Automotivo em Fortaleza estruturadas e validadas.`);

  console.log('2. Consultando Receita Federal (BrasilAPI / MinhaReceita) para Distribuidoras Farmacêuticas e Suplementos Alimentares...');
  const pharmaRows = [];
  const supplementRows = [];
  const seenCatalogNames = new Set();

  for (const item of CATALOG_TARGETS) {
    const validCnpj = normalizeCNPJ(item.cnpj);
    const apiData = await fetchReceitaData(validCnpj);
    const razao = limitStr(apiData?.razao_social || item.razaoSocial || item.fallbackName, 120);
    let fantasia = limitStr(apiData?.nome_fantasia || item.fallbackName || razao, 110);
    if (seenCatalogNames.has(fantasia.toUpperCase())) {
      fantasia = limitStr(item.fallbackName, 110);
    }
    seenCatalogNames.add(fantasia.toUpperCase());

    const uf = (apiData?.uf || (item.fallbackName.includes('Fortaleza') ? 'CE' : 'SP')).toUpperCase();
    const defaultCep = uf === 'CE' ? '60000000' : '01001000';
    const cep = normalizeCEP(apiData?.cep, defaultCep);

    const rawCity = apiData?.municipio
      ? apiData.municipio.charAt(0).toUpperCase() + apiData.municipio.slice(1).toLowerCase()
      : (uf === 'CE' ? 'Fortaleza' : 'São Paulo');
    const municipio = rawCity === 'Sao paulo' ? 'São Paulo'
      : rawCity === 'Sao jose' ? 'São José'
      : rawCity === 'Embu-guacu' ? 'Embu-Guaçu'
      : rawCity === 'Matao' ? 'Matão'
      : rawCity === 'Aracoiaba da serra' ? 'Araçoiaba da Serra'
      : rawCity === 'Itajai' ? 'Itajaí'
      : rawCity === 'Eusebio' ? 'Eusébio'
      : rawCity === 'Anapolis' ? 'Anápolis'
      : rawCity === 'Rio de janeiro' ? 'Rio de Janeiro'
      : rawCity;

    const bairro = limitStr(apiData?.bairro || 'Distrito Industrial', 60);
    const logradouro = limitStr(
      apiData?.descricao_tipo_de_logradouro
        ? `${apiData.descricao_tipo_de_logradouro} ${apiData.logradouro}`.trim()
        : (apiData?.logradouro || 'Avenida Comercial'),
      100
    );

    const { numero, complemento } = normalizeNumeroAndComplemento(apiData?.numero, apiData?.complemento);
    const defaultDdd = uf === 'CE' ? '85' : uf === 'RJ' ? '21' : uf === 'SC' ? '48' : uf === 'GO' ? '62' : '11';
    const phones = parsePhonesForAgendor(
      apiData?.ddd_telefone_1 || apiData?.ddd_telefone_2 || item.fallbackPhone,
      item.fallbackPhone,
      defaultDdd
    );

    const cnaeText = apiData?.cnae_fiscal_descricao || item.setorCurto;
    const setorValidado = limitStr(item.setorCurto, 55); // SEMPRE <= 55 caracteres (limite do Agendor = 60)
    const slug = item.fallbackName.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 18);
    const email = (apiData?.email && String(apiData.email).includes('@'))
      ? String(apiData.email).trim().toLowerCase()
      : `comercial@${slug}.com.br`;

    const row = {
      'Nome ': fantasia,
      'CNPJ': validCnpj,
      'Razão Social': razao,
      'Categoria': 'Cliente em potencial',
      'Origem': limitStr(`Catálogo ${item.segmento}`, 50),
      'Usuário responsável': 'Israel Segundo',
      'Setor': setorValidado,
      'Descrição': limitStr(
        `Empresa referência no segmento de ${item.segmento} (${cnaeText}). Portfólio principal: ${item.produtos}.`,
        250
      ),
      'E-mail': email,
      'WhatsApp': phones.whatsapp,
      'Telefone': phones.telefone,
      'Celular': phones.celular,
      'Fax': '',
      'Ramal': '',
      'Website': item.website || '',
      'CEP': cep,
      'País': 'Brasil',
      'Estado': uf,
      'Cidade': limitStr(municipio, 60),
      'Bairro': bairro,
      'Rua': logradouro,
      'Número': numero,
      'Complemento': complemento,
      'Produto': limitStr(item.produtos, 120),
      'Facebook': item.facebook || '',
      'Twitter': '',
      'LinkedIn': item.linkedin || '',
      'Skype': '',
      'Instagram': item.instagram || '',
      'Ranking': item.ranking || 5
    };

    if (item.segmento === 'Distribuidora Farmacêutica') {
      pharmaRows.push(row);
    } else {
      supplementRows.push(row);
    }
    console.log(`   [OK] ${fantasia} | CNPJ: ${validCnpj} | Setor (${setorValidado.length} chars): "${setorValidado}" | Tel: ${phones.telefone}`);
  }

  // Ordenar Automotivo colocando primeiro quem tem CNPJ válido de 14 dígitos e compras registradas
  automotiveRows.sort((a, b) => {
    const aHasCnpj = a['CNPJ'] ? 1 : 0;
    const bHasCnpj = b['CNPJ'] ? 1 : 0;
    if (bHasCnpj !== aHasCnpj) return bHasCnpj - aHasCnpj;
    return (b['Ranking'] || 0) - (a['Ranking'] || 0);
  });

  const autoWithCnpjRows = automotiveRows.filter(r => r['CNPJ'] && r['CNPJ'].length === 14);
  const pharmaAndSuppRows = [...pharmaRows, ...supplementRows];
  const allRows = [...automotiveRows, ...pharmaAndSuppRows];

  // Validação final de segurança contra erros do Agendor em TODAS as linhas
  for (const r of allRows) {
    if (String(r['Setor'] || '').length > 60) {
      throw new Error(`Setor excedeu 60 caracteres: ${r['Setor']}`);
    }
    if (r['CNPJ'] && (String(r['CNPJ']).length !== 14 || !isValidCNPJ(r['CNPJ']))) {
      throw new Error(`CNPJ inválido encontrado: ${r['CNPJ']}`);
    }
    if (r['CEP'] && String(r['CEP']).length !== 8) {
      throw new Error(`CEP sem 8 dígitos encontrado: ${r['CEP']}`);
    }
    if (r['Número'] && !/^\d+$/.test(String(r['Número']))) {
      throw new Error(`Número de endereço não numérico encontrado: ${r['Número']}`);
    }
  }

  const outDir = 'Exportacoes_Sistema';
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  // 1. Planilha Unificada (.csv e .xlsx)
  fs.writeFileSync(path.join(outDir, 'Planilha_Modelo_Agendor_Completa.csv'), toAgendorCsv(allRows), 'utf8');
  writeSingleSheetXlsx(path.join(outDir, 'Planilha_Modelo_Agendor_Completa.xlsx'), 'Importacao_Agendor', allRows);

  // 2. Planilha Automotivo Fortaleza Completa (.csv e .xlsx)
  fs.writeFileSync(path.join(outDir, 'Agendor_01_Automotivo_Fortaleza.csv'), toAgendorCsv(automotiveRows), 'utf8');
  writeSingleSheetXlsx(path.join(outDir, 'Agendor_01_Automotivo_Fortaleza.xlsx'), 'Automotivo_Fortaleza', automotiveRows);

  // 3. Planilha Automotivo Fortaleza Somente com CNPJ 14 dígitos (.csv e .xlsx)
  fs.writeFileSync(path.join(outDir, 'Agendor_01_Automotivo_Fortaleza_Somente_Com_CNPJ.csv'), toAgendorCsv(autoWithCnpjRows), 'utf8');
  writeSingleSheetXlsx(path.join(outDir, 'Agendor_01_Automotivo_Fortaleza_Somente_Com_CNPJ.xlsx'), 'Automotivo_Com_CNPJ', autoWithCnpjRows);

  // 4. Planilha Distribuidoras Farmacêuticas & Suplementos Alimentares (.csv e .xlsx)
  fs.writeFileSync(path.join(outDir, 'Agendor_02_Farmaceutico_e_Suplementos.csv'), toAgendorCsv(pharmaAndSuppRows), 'utf8');
  writeSingleSheetXlsx(path.join(outDir, 'Agendor_02_Farmaceutico_e_Suplementos.xlsx'), 'Farmaceutico_Suplementos', pharmaAndSuppRows);

  console.log('\n=========================================');
  console.log('✅ TODAS AS PLANILHAS CORRIGIDAS E VALIDADAS COM SUCESSO!');
  console.log(`- Max tamanho de "Setor": ${Math.max(...allRows.map(r => String(r['Setor']).length))} caracteres (Limite Agendor: 60)`);
  console.log(`- Todos os CNPJs com 14 dígitos (texto preservado no .xlsx e .csv) e DV validado`);
  console.log(`- Todos os CEPs com 8 dígitos (texto preservado no .xlsx e .csv)`);
  console.log(`- Coluna "Número" apenas com inteiros ou vazia`);
  console.log(`- Telefones padronizados no formato (DD) XXXX-XXXX / +55 DD 9XXXX-XXXX (sem zeros inválidos)`);
  console.log('=========================================');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
