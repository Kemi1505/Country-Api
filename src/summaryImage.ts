import { createCanvas } from 'canvas';
import * as fs from 'fs';
import * as path from 'path';

interface SummaryData {
  totalCountries: number;
  top5Gdp: { name: string; gdp: number }[];
  lastRefreshedAt: string;
}

const CACHE_DIR = path.join(__dirname, '..', 'cache');
const SUMMARY_PATH = path.join(CACHE_DIR, 'summary.png');

export const generateSummaryImage = async (data: SummaryData) => {
  // Ensure cache directory exists
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }


  const width = 1200;
  const height = 800;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  const titleFont = 'bold 36px Arial';
  const headerFont = '24px Arial';
  const bodyFont = '20px Arial';

  ctx.fillStyle = '#000000';
  ctx.font = titleFont;
  ctx.fillText('Countries Summary', 40, 60);

  ctx.font = headerFont;
  ctx.fillText(`Total countries: ${data.totalCountries}`, 40, 110);

  ctx.font = headerFont;
  ctx.fillText('Top 5 by estimated GDP:', 40, 160);

  ctx.font = bodyFont;
  const startY = 200;
  const lineHeight = 36;
  data.top5Gdp.forEach((item, idx) => {
    const y = startY + idx * lineHeight;
    const gdpDisplay = Number.isFinite(item.gdp) ? item.gdp.toFixed(2) : 'N/A';
    ctx.fillText(`${idx + 1}. ${item.name} — ${gdpDisplay}`, 60, y);
  });

  ctx.font = headerFont;
  ctx.fillText(`Last refreshed: ${data.lastRefreshedAt}`, 40, height - 80);

  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(SUMMARY_PATH, buffer);
};

export const getSummaryImagePath = () => SUMMARY_PATH;