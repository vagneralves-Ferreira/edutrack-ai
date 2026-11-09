import puppeteer from 'puppeteer';
import path from 'path';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  const screenshotsDir = path.join(process.cwd(), 'screenshots');

  // --- SUBJECTS CRUD ---
  console.log('Navigating to Disciplinas...');
  await page.goto('http://localhost:5173/disciplinas', { waitUntil: 'networkidle0', timeout: 30000 });
  await delay(1500);

  // 1. READ (Subjects)
  await page.screenshot({ path: path.join(screenshotsDir, '01_subjects_read.png') });
  console.log('Saved 01_subjects_read.png');

  // 2. CREATE (Subjects)
  await page.evaluate(() => {
    // Find "Nova Disciplina" button
    const buttons = Array.from(document.querySelectorAll('button'));
    const addBtn = buttons.find(b => b.innerText.includes('Nova Disciplina'));
    if (addBtn) addBtn.click();
  });
  await delay(1000);
  
  // Fill the form
  await page.evaluate(() => {
    const inputs = document.querySelectorAll('input[type="text"]');
    if (inputs.length >= 3) {
      inputs[0].value = 'TST-999';
      inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
      
      inputs[1].value = 'Disciplina de Teste E2E';
      inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
      
      inputs[2].value = 'Prof. Automático';
      inputs[2].dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await delay(500);
  await page.screenshot({ path: path.join(screenshotsDir, '02_subjects_create.png') });
  console.log('Saved 02_subjects_create.png');
  
  // Submit Subject
  await page.evaluate(() => {
    const submitBtn = document.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.click();
  });
  await delay(1000);


  // --- TASKS CRUD ---
  console.log('Navigating to Tarefas...');
  await page.goto('http://localhost:5173/tarefas', { waitUntil: 'networkidle0', timeout: 30000 });
  await delay(1500);

  // 3. READ (Tasks)
  await page.screenshot({ path: path.join(screenshotsDir, '03_tasks_read.png') });
  console.log('Saved 03_tasks_read.png');

  // 4. CREATE (Tasks)
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const addBtn = buttons.find(b => b.innerText.includes('Nova Tarefa'));
    if (addBtn) addBtn.click();
  });
  await delay(1000);

  // Fill Tasks form
  await page.evaluate(() => {
    const textInput = document.querySelector('input[type="text"]');
    if (textInput) {
      textInput.value = 'Estudar Puppeteer';
      textInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
    const dateInput = document.querySelector('input[type="date"]');
    if (dateInput) {
      dateInput.value = '2026-10-30';
      dateInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await delay(500);
  await page.screenshot({ path: path.join(screenshotsDir, '04_tasks_create.png') });
  console.log('Saved 04_tasks_create.png');

  // Submit Task
  await page.evaluate(() => {
    const submitBtn = document.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.click();
  });
  await delay(1000);

  // 5. UPDATE (Tasks)
  // Find "Em Andamento" button
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const inProgressBtn = buttons.find(b => b.innerText.includes('Em Andamento'));
    if (inProgressBtn) inProgressBtn.click();
  });
  await delay(1000);
  await page.screenshot({ path: path.join(screenshotsDir, '05_tasks_update.png') });
  console.log('Saved 05_tasks_update.png');

  // 6. DELETE (Tasks)
  // Hover over the task to show delete button, wait actually we can just click the trash icon directly if it's there
  await page.evaluate(() => {
    // Find the trash icon (svg with lucide-trash-2 class) inside a button
    const trashSvgs = Array.from(document.querySelectorAll('svg.lucide-trash-2'));
    if (trashSvgs.length > 0) {
      // Find the first task we just created or any task and delete it
      const deleteBtn = trashSvgs[0].closest('button');
      if (deleteBtn) deleteBtn.click();
    }
  });
  await delay(1000);
  await page.screenshot({ path: path.join(screenshotsDir, '06_tasks_delete.png') });
  console.log('Saved 06_tasks_delete.png');

  await browser.close();
  console.log('All CRUD screenshots taken!');
}

run();
