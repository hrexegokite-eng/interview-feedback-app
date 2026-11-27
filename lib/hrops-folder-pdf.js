import { createElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { api } from '@/components/ui';
import FnfDocument from '@/components/fnf-document';
import PayslipDocument from '@/components/payslip-document';
import { calculateFnf } from '@/lib/fnf-calculations';
import { calculatePayslip } from '@/lib/payslip-calculations';

export const FOLDER_PDF_CONFIRMATION = 'This PDF contains all saved FNF settlements and payslips for this employee, including salary and bank details. Continue only if you are authorized to access and store it.';
export const ALL_FOLDERS_ZIP_CONFIRMATION = 'This ZIP contains every saved FNF settlement and payslip for all employees, including salary and bank details. Continue only if you are authorized to access and store all employee records.';
const clean = (value) => String(value ?? '-').replace(/[^\x20-\x7E]/g, ' ').trim() || '-';

function addTable(doc, autoTable, head, body, startY) {
  autoTable(doc, {
    head: [head.map(clean)],
    body: body.map((row) => row.map(clean)),
    startY,
    margin: { left: 14, right: 14, bottom: 18 },
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2.2, overflow: 'linebreak', valign: 'top' },
    headStyles: { fillColor: [30, 55, 75], fontStyle: 'bold' },
    rowPageBreak: 'avoid',
  });
  return doc.lastAutoTable.finalY + 7;
}

async function renderSettlementCanvas(record) {
  const data = record.data;
  const totals = calculateFnf(data);
  const { default: html2canvas } = await import('html2canvas');
  const host = document.createElement('div');
  host.dataset.fnfExport = 'true';
  host.style.cssText = 'position:fixed;left:0;top:0;z-index:-1;width:794px;pointer-events:none;opacity:0;';
  document.body.appendChild(host);
  const root = createRoot(host);

  try {
    flushSync(() => {
      root.render(createElement(FnfDocument, { data, totals }));
    });
    const paper = host.querySelector('.fnf-paper');
    if (!paper) throw new Error('Unable to render the saved F&F settlement.');

    await Promise.all(Array.from(paper.querySelectorAll('img'), (image) => {
      if (image.complete) {
        return image.naturalWidth
          ? Promise.resolve()
          : Promise.reject(new Error('The saved F&F company logo could not be loaded.'));
      }
      return new Promise((resolve, reject) => {
        image.addEventListener('load', resolve, { once: true });
        image.addEventListener('error', () => reject(new Error('The saved F&F company logo could not be loaded.')), { once: true });
      });
    }));

    const width = 794;
    const height = Math.max(1123, Math.ceil(paper.getBoundingClientRect().height));
    return await html2canvas(paper, {
      backgroundColor: '#ffffff',
      height,
      scale: 2,
      useCORS: true,
      width,
      windowHeight: height,
      windowWidth: width,
      onclone: (clonedDocument) => {
        const clonedHost = clonedDocument.querySelector('[data-fnf-export="true"]');
        if (clonedHost) {
          clonedHost.style.opacity = '1';
          clonedHost.style.zIndex = '2147483647';
        }
        const clonedPaper = clonedHost?.querySelector('.fnf-paper');
        if (clonedPaper) {
          clonedPaper.style.position = 'fixed';
          clonedPaper.style.top = '0';
          clonedPaper.style.left = '0';
          clonedPaper.style.margin = '0';
          clonedPaper.style.boxShadow = 'none';
          clonedPaper.style.zoom = '1';
        }
      },
    });
  } finally {
    root.unmount();
    host.remove();
  }
}

function addCanvasPages(doc, canvas, addNewPage = true) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxSliceHeight = Math.ceil(canvas.width * pageHeight / pageWidth);
  const pages = [];

  for (let offsetY = 0; offsetY < canvas.height; offsetY += maxSliceHeight) {
    if (offsetY > 0 || addNewPage) doc.addPage();
    const sliceHeight = Math.min(maxSliceHeight, canvas.height - offsetY);
    const slice = document.createElement('canvas');
    slice.width = canvas.width;
    slice.height = sliceHeight;
    const context = slice.getContext('2d');
    if (!context) throw new Error('Unable to prepare the document PDF page.');
    context.drawImage(canvas, 0, offsetY, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
    doc.addImage(
      slice.toDataURL('image/jpeg', 0.94),
      'JPEG',
      0,
      0,
      pageWidth,
      pageWidth * sliceHeight / canvas.width,
      undefined,
      'FAST',
    );
    pages.push(doc.internal.getNumberOfPages());
  }

  return pages;
}

function addHeading(doc, title, subtitle) {
  doc.setFontSize(16);
  doc.text(clean(title), 14, 17);
  doc.setFontSize(9);
  doc.text(clean(subtitle), 14, 23);
}

async function renderPayslipCanvas(record) {
  const data = record.data || {};
  const form = {
    ...data,
    month: data.month || record.month || '',
    earnings: Array.isArray(data.earnings) ? data.earnings : [],
    deductions: Array.isArray(data.deductions) ? data.deductions : [],
  };
  const totals = calculatePayslip(form);
  const { default: html2canvas } = await import('html2canvas');
  const host = document.createElement('div');
  host.dataset.payslipExport = 'true';
  host.style.cssText = 'position:fixed;left:0;top:0;z-index:-1;width:794px;pointer-events:none;opacity:0;';
  document.body.appendChild(host);
  const root = createRoot(host);

  try {
    flushSync(() => {
      root.render(createElement(PayslipDocument, {
        form,
        totals,
        generatedAt: new Date(),
        previewScale: 1,
      }));
    });
    const paper = host.querySelector('.payslip-paper');
    if (!paper) throw new Error('Unable to render the saved payslip.');

    const logo = paper.querySelector('img');
    if (logo) {
      if (!logo.complete) {
        await new Promise((resolve, reject) => {
          logo.addEventListener('load', resolve, { once: true });
          logo.addEventListener('error', () => reject(new Error('The saved payslip logo could not be loaded.')), { once: true });
        });
      }
      if (!logo.naturalWidth) throw new Error('The saved payslip logo could not be loaded.');
    }

    return await html2canvas(paper, {
      backgroundColor: '#ffffff',
      height: 1123,
      scale: 2,
      useCORS: true,
      width: 794,
      windowHeight: 1123,
      windowWidth: 794,
      onclone: (clonedDocument) => {
        const clonedHost = clonedDocument.querySelector('[data-payslip-export="true"]');
        if (clonedHost) {
          clonedHost.style.opacity = '1';
          clonedHost.style.zIndex = '2147483647';
        }
        const clonedPaper = clonedHost?.querySelector('.payslip-paper');
        if (clonedPaper) {
          clonedPaper.style.position = 'fixed';
          clonedPaper.style.top = '0';
          clonedPaper.style.left = '0';
          clonedPaper.style.margin = '0';
          clonedPaper.style.boxShadow = 'none';
          clonedPaper.style.zoom = '1';
        }
      },
    });
  } finally {
    root.unmount();
    host.remove();
  }
}

async function addPayslip(doc, record, addNewPage = true) {
  const canvas = await renderPayslipCanvas(record);
  return addCanvasPages(doc, canvas, addNewPage);
}

async function addSettlement(doc, record, addNewPage = true) {
  const canvas = await renderSettlementCanvas(record);
  return addCanvasPages(doc, canvas, addNewPage);
}

export async function createPayslipPdf(form) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  await addPayslip(doc, { data: form, month: form.month }, false);
  const name = safeArchiveName(form.name, 'employee');
  const monthName = safeArchiveName(form.month, 'payslip');
  return new File([doc.output('blob')], `${name}-${monthName}-payslip.pdf`, { type: 'application/pdf' });
}

export async function prepareHropsFolderPdf(personId) {
  const folder = await api(`/api/hrops/people/${personId}/folder`);
  if (!folder.settlements.length && !folder.payslips.length) {
    throw new Error('There are no saved documents in this employee folder.');
  }
  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const autoTable = autoTableModule.default;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const { person, settlements, payslips } = folder;
  const employeeName = clean(person.name);
  const employeeId = clean(person.employee_id);
  const templatePages = new Set();
  doc.setProperties({
    title: `Employee folder - ${employeeName}`,
    subject: 'Confidential employee folder export',
  });
  addHeading(doc, 'Employee Folder', employeeName);
  addTable(doc, autoTable, ['Folder detail', 'Value'], [
    ['Employee ID', employeeId],
    ['FNF settlements', settlements.length],
    ['Payslips', payslips.length],
    ['Included documents', 'All saved FNF settlements and payslips'],
    ['Generated', new Date().toLocaleString()],
  ], 29);

  for (const record of settlements) {
    for (const pageNumber of await addSettlement(doc, record)) {
      templatePages.add(pageNumber);
    }
  }
  for (const record of payslips) {
    for (const pageNumber of await addPayslip(doc, record)) {
      templatePages.add(pageNumber);
    }
  }

  const pageCount = doc.internal.getNumberOfPages();
  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    doc.setPage(pageNumber);
    if (templatePages.has(pageNumber)) continue;
    doc.setFontSize(8);
    doc.text(
      `Confidential employee folder · Page ${pageNumber} of ${pageCount}`,
      14,
      doc.internal.pageSize.getHeight() - 7,
    );
  }

  const filename = employeeName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'employee';
  const file = new File([doc.output('blob')], `${filename}-employee-folder.pdf`, { type: 'application/pdf' });
  return {
    file,
    title: `Employee folder - ${employeeName}`,
    text: `Saved FNF settlements and payslips for ${employeeName}`,
  };
}

export function canShareHropsFolderPdf(file) {
  return Boolean(navigator.share && navigator.canShare?.({ files: [file] }));
}

export function sharePreparedHropsFolderPdf({ file, title, text }) {
  return navigator.share({ files: [file], title, text }).then(
    () => 'shared',
    (error) => {
      if (error.name === 'AbortError') return 'cancelled';
      throw error;
    },
  );
}

export function downloadHropsFolderPdf(file) {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'downloaded';
}

function safeArchiveName(value, fallback) {
  return String(value || fallback)
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/[. ]+$/g, '')
    .slice(0, 100) || fallback;
}

export async function prepareAllHropsFoldersZip(onProgress) {
  const people = await api('/api/hrops/people');
  if (!people.length) throw new Error('There are no employee folders to download.');

  const [{ jsPDF }, zipModule] = await Promise.all([
    import('jspdf'),
    import('jszip'),
  ]);
  const zip = new zipModule.default();
  const root = zip.folder('Employee Folders');
  const usedFolderNames = new Map();

  for (let index = 0; index < people.length; index += 1) {
    const person = people[index];
    const employeeName = safeArchiveName(person.name, `Employee ${index + 1}`);
    const employeeId = safeArchiveName(person.employee_id, '');
    const baseName = employeeId ? `${employeeName} - ${employeeId}` : employeeName;
    const duplicateCount = usedFolderNames.get(baseName) || 0;
    usedFolderNames.set(baseName, duplicateCount + 1);
    const folderName = duplicateCount ? `${baseName} (${duplicateCount + 1})` : baseName;
    const archiveFolder = root.folder(folderName);
    const folder = await api(`/api/hrops/people/${person.id}/folder`);

    if (!folder.settlements.length && !folder.payslips.length) {
      archiveFolder.file('No saved documents.txt', 'No FNF settlements or payslips are saved for this employee.');
    }

    for (const record of folder.settlements) {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      doc.setProperties({ title: 'Full & Final Settlement', subject: `Employee folder - ${employeeName}` });
      await addSettlement(doc, record, false);
      const id = safeArchiveName(record.id, 'settlement');
      archiveFolder.file(`FNF Settlement ${id}.pdf`, doc.output('blob'));
    }

    for (const record of folder.payslips) {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      doc.setProperties({ title: `Salary Slip - ${record.month}`, subject: `Employee folder - ${employeeName}` });
      await addPayslip(doc, record, false);
      const monthName = safeArchiveName(record.month, 'Payslip');
      const id = safeArchiveName(record.id, 'payslip');
      archiveFolder.file(`${monthName} Payslip ${id}.pdf`, doc.output('blob'));
    }

    onProgress?.({ phase: 'folders', completed: index + 1, total: people.length });
  }

  const blob = await zip.generateAsync(
    { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
    ({ percent }) => onProgress?.({ phase: 'compressing', percent }),
  );
  const date = new Date().toISOString().slice(0, 10);
  return new File([blob], `employee-folders-${date}.zip`, { type: 'application/zip' });
}
