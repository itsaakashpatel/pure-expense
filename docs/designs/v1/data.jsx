// data.jsx — sample CAD data, June 2026

const MONTH_TOTAL = 1847.20;
const PREV_TOTAL  = 1702.55;
const BUDGET      = 2200;

// last 6 months
const MONTHS = [
  { m: 'Jan', total: 1620.40 },
  { m: 'Feb', total: 1890.10 },
  { m: 'Mar', total: 1455.75 },
  { m: 'Apr', total: 2010.30 },
  { m: 'May', total: 1702.55 },
  { m: 'Jun', total: 1847.20 },
];

// category breakdown for June (sums to MONTH_TOTAL)
const BREAKDOWN = [
  { cat: 'food',       amount: 512.40 },
  { cat: 'groceries',  amount: 438.90 },
  { cat: 'transport',  amount: 246.10 },
  { cat: 'shopping',   amount: 318.75 },
  { cat: 'travel',     amount: 205.00 },
  { cat: 'utilities',  amount: 126.05 },
];

// transactions grouped by day
const TXNS = [
  { group: 'Today · Jun 9', items: [
    { id: 't1', merchant: 'Blue Bottle Coffee', cat: 'food',      amount: 8.75,  time: '8:42 AM', method: 'Apple Pay' },
    { id: 't2', merchant: 'Presto Transit',     cat: 'transport', amount: 6.50,  time: '9:05 AM', method: 'Presto Card' },
  ]},
  { group: 'Yesterday · Jun 8', items: [
    { id: 't3', merchant: 'Loblaws',            cat: 'groceries', amount: 94.32, time: '6:18 PM', method: 'Visa ·· 4021' },
    { id: 't4', merchant: 'Uniqlo',             cat: 'shopping',  amount: 78.00, time: '2:30 PM', method: 'Visa ·· 4021' },
  ]},
  { group: 'Jun 6', items: [
    { id: 't5', merchant: 'The Keg Steakhouse', cat: 'food',      amount: 142.60, time: '7:55 PM', method: 'Amex ·· 1009' },
    { id: 't6', merchant: 'Shell',              cat: 'transport', amount: 65.40,  time: '1:12 PM', method: 'Visa ·· 4021' },
  ]},
  { group: 'Jun 4', items: [
    { id: 't7', merchant: 'Air Canada',         cat: 'travel',    amount: 205.00, time: '11:20 AM', method: 'Amex ·· 1009' },
  ]},
  { group: 'Jun 2', items: [
    { id: 't8', merchant: 'Toronto Hydro',      cat: 'utilities', amount: 89.20,  time: '9:00 AM', method: 'Pre-auth' },
    { id: 't9', merchant: 'Metro',              cat: 'groceries', amount: 52.18,  time: '5:40 PM', method: 'Visa ·· 4021' },
  ]},
];

// the freshly-scanned receipt awaiting verification
const SCANNED = {
  merchant: 'Café Pamenar',
  cat: 'food',
  date: 'Jun 9, 2026',
  time: '1:24 PM',
  method: 'Visa ·· 4021',
  currency: 'CAD',
  lineItems: [
    { name: 'Flat White',        price: 5.25 },
    { name: 'Avocado Toast',     price: 14.00 },
    { name: 'Sparkling Water',   price: 4.50 },
  ],
  subtotal: 23.75,
  tax: 3.09,
  tip: 4.75,
  total: 31.59,
  confidence: 0.96,
};

Object.assign(window, { MONTH_TOTAL, PREV_TOTAL, BUDGET, MONTHS, BREAKDOWN, TXNS, SCANNED });
