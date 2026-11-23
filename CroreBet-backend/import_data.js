const fs = require('fs');
const csv = require('csv-parser');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const results = [];

fs.createReadStream('charts_clean.csv')
  .pipe(csv())
  .on('data', (data) => results.push(data))
  .on('end', async () => {
    console.log(`Found ${results.length} clean records. Importing to Database...`);
    let count = 0;

    for (const row of results) {
      const market = row['Market'];
      const dateStr = row['Date']; // Already formatted as YYYY-MM-DD by Python
      
      if (!dateStr) continue;
      
      const currentDate = new Date(`${dateStr}T00:00:00.000Z`);

      try {
        await prisma.chartOpenClose.upsert({
          where: {
            marketName_resultDate: {
              marketName: market,
              resultDate: currentDate,
            }
          },
          update: {
            jodi: row['Jodi'] || null,
            openPanna: row['OpenPanna'] || null,
            openDigit: row['OpenDigit'] || null,
            closePanna: row['ClosePanna'] || null,
            closeDigit: row['CloseDigit'] || null,
          },
          create: {
            marketName: market,
            resultDate: currentDate,
            jodi: row['Jodi'] || null,
            openPanna: row['OpenPanna'] || null,
            openDigit: row['OpenDigit'] || null,
            closePanna: row['ClosePanna'] || null,
            closeDigit: row['CloseDigit'] || null,
          }
        });
        count++;
      } catch (err) {
        console.error(`❌ Error inserting ${market} - ${dateStr}:`, err.message);
      }
    }
    
    console.log(`🎉 Successfully inserted/updated ${count} records in chart_open_close!`);
    await prisma.$disconnect();
  });
