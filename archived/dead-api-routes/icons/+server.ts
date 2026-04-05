import { json } from '@sveltejs/kit';
import fs from 'fs';
import path from 'path';
import type { RequestHandler } from './$types';

interface IconItem {
  name: string;
  path: string;
}

interface IconCategory {
  name: string;
  icons: IconItem[];
}

const loadIconsFromJSON = (): IconCategory[] => {
  const categories: IconCategory[] = [];

  try {
    // Load AWS icons from JSON
    const awsIconsPath = path.join(process.cwd(), 'static/icons/aws/icons.json');
    if (fs.existsSync(awsIconsPath)) {
      const awsIconsData = fs.readFileSync(awsIconsPath, 'utf8');
      const awsIcons = JSON.parse(awsIconsData);

      if (awsIcons.icons) {
        const awsCategory: IconCategory = {
          name: 'AWS',
          icons: Object.keys(awsIcons.icons).map((iconKey) => ({
            name: iconKey, // Keep full key for searchability
            path: `/icons/aws/icons.json#${iconKey}`
          }))
        };
        categories.push(awsCategory);
      }
    }
  } catch (error) {
    console.error('Error loading icons from JSON:', error);
  }

  return categories;
};

export const GET: RequestHandler = async () => {
  try {
    const categories = loadIconsFromJSON();
    return json(categories);
  } catch (error) {
    console.error('Error serving icons:', error);
    return json({ error: 'Failed to load icons' }, { status: 500 });
  }
};
