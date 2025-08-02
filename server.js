const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const app = express();
const PORT = 3000;

app.use(express.static('public'));
app.use(express.json());

const machinesFile = path.join(__dirname, 'data', 'machines.txt');
const customersFile = path.join(__dirname, 'data', 'customers.txt');
const rentalsFile = path.join(__dirname, 'data', 'rentals.txt');

async function parseTextData(filePath) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return data
      .split('\n')
      .filter(Boolean)
      .map(line => {
        return Object.fromEntries(
          line.split('|').map(part => {
            const [key, value] = part.split(':').map(s => s.trim());
            return [key, value];
          })
        );
      });
  } catch (err) {
    console.error(`Error reading file ${filePath}:`, err);
    return [];
  }
}

function formatDataLine(obj) {
  return Object.entries(obj).map(([k, v]) => `${k}: ${v}`).join(' | ');
}

// ----- MACHINE APIs -----
app.get('/api/machines', async (req, res) => {
  const data = await parseTextData(machinesFile);
  res.json(data);
});

app.post('/api/machines', async (req, res) => {
  const newMachine = req.body;
  const line = formatDataLine(newMachine);
  await fs.appendFile(machinesFile, `\n${line}`);
  res.status(201).send('Machine added');
});

app.put('/api/machines', (req, res) => {
  const updated = req.body;

  fs.readFile('data/machines.txt', 'utf-8', (err, data) => {
    if (err) return res.status(500).send('Failed to read machines file');

    let machines = data.trim().split('\n').map(line => JSON.parse(line));
    const index = machines.findIndex(m => m.ID == updated.ID);

    if (index === -1) {
      return res.status(404).send('Machine not found');
    }

    machines[index] = updated;

    fs.writeFile('data/machines.txt', machines.map(m => JSON.stringify(m)).join('\n'), err => {
      if (err) return res.status(500).send('Failed to write machines file');
      res.send({ success: true });
    });
  });
});


// ----- CUSTOMER APIs -----
app.get('/api/customers', async (req, res) => {
  const data = await parseTextData(customersFile);
  res.json(data);
});

app.post('/api/customers', async (req, res) => {
  const newCustomer = req.body;
  const line = formatDataLine(newCustomer);
  await fs.appendFile(customersFile, `\n${line}`);
  res.status(201).send('Customer added');
});

// ----- RENTAL APIs -----
app.get('/api/rentals', async (req, res) => {
  const data = await parseTextData(rentalsFile);
  res.json(data);
});

function appendTextData(filePath, data) {
  const fs = require('fs');

  fs.appendFile(filePath, JSON.stringify(data) + '\n', (err) => {
    if (err) {
      console.error('Error writing to file:', err);
    } else {
      //console.log('Data appended to file');
    }
  });
}
app.post('/api/rentals', async (req, res) => {

console.log('Incoming rental data:', req.body);
  try {
    const rentals = await parseTextData(rentalsFile);
    const newId = rentals.length > 0 ? (parseInt(rentals[rentals.length - 1].RentalID) + 1) : 1;
    const rental = {
      RentalID: newId.toString(),
      MachineID: req.body.MachineID,
      CustomerID: req.body.CustomerID,
      Start: req.body.Start,
      End: req.body.End,
      Count: req.body.Count
    };

    const line = formatDataLine(rental);

    await fs.appendFile(rentalsFile, `\n${line}`);
    //await appendTextData(rentalsFile, rental);

    res.status(201).json({ message: 'Rental recorded', rental });
  } catch (err) {
    console.error('Error saving rental:', err);
    res.status(500).send('Error saving rental.');
  }
});

app.put('/api/rentals', (req, res) => {
  const updated = req.body;
  fs.readFile('data/rentals.txt', 'utf-8', (err, data) => {
    if (err) return res.status(500).send('Cannot read rentals');

    const lines = data.trim().split('\n');
    const rentals = lines.map(line => JSON.parse(line));
    const idx = rentals.findIndex(r => r.RentalID == updated.RentalID);
    if (idx === -1) return res.status(404).send('Rental not found');

    rentals[idx] = updated;

    fs.writeFile('data/rentals.txt', rentals.map(r => JSON.stringify(r)).join('\n'), err => {
      if (err) return res.status(500).send('Failed to update');
      res.send({ success: true });
    });
  });
});


function getNextRentalId() {
  if (!fs.existsSync('rentals.txt')) return 1;

  const data = fs.readFileSync('rentals.txt', 'utf-8').trim();
  if (!data) return 1;

  const lines = data.split('\n');
  const lastLine = lines[lines.length - 1];

  try {
    const lastRental = JSON.parse(lastLine); // convert string back to object
    return parseInt(lastRental.RentalID) + 1;
  } catch (err) {
    console.error('Error parsing rental data:', err);
    return 1; // fallback
  }
}


// Start server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});