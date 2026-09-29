/**
 * Bulk Delete Users
 *
 * SETUP
 * 0. Open the Apps Scripts page from any Google app
 * 1. Services (+) → add "Admin SDK API" (AdminDirectory)
 * 2. Paste in the following code, customize as you like
 * 3. Deploy → New deployment → Web app
 *      Execute as: Me
 *      Who has access: Only myself
 * 4. Must be run by an admin with permission to delete users
 *
 * USAGE
 * First sheet, third column = user email addresses (row 1 is a header).
 */

function doGet() {
  return HtmlService.createHtmlOutput(PAGE).setTitle('Delete Users');
}

const PAGE = `
<h1>Select a list of users to delete</h1>
<p>CAUTION: clicking "delete users" <strong>will delete</strong> all users listed in the first sheet's third column.
  Be <strong>sure</strong> you want that before you click the button.
</p>
<select id="pick"><option>Loading…</option></select>
<button onclick="go()">Delete Users</button>
<div id="success"></div>
<pre id="errors"></pre>
<script>
  google.script.run.withSuccessHandler(files => {
    const sel = document.getElementById('pick');
    sel.innerHTML = '';
    files.forEach(f => sel.add(new Option(f.name, f.id)));
  }).listSpreadsheets();

  function go() {
    const sel = document.getElementById('pick');
    const name = sel.options[sel.selectedIndex].text;
    if (!confirm('Delete ALL users listed in "' + name + '"? This cannot be undone.')) return;

    document.getElementById('success').textContent = 'Working…';
    document.getElementById('errors').textContent = '';

    google.script.run
      .withSuccessHandler(out => {
        document.getElementById('success').textContent = out["success"] + " successful deletions";
        document.getElementById('errors').textContent = out["errors"].join("\\n");
      })
      .withFailureHandler(err => {
        document.getElementById('success').textContent = '?';
        document.getElementById('errors').textContent = 'Script stopped: ' + err.message;
      })
      .deleteUsers(sel.value);
  }
</script>
`;

// Returns your Google Sheets (up to 200) for the dropdown
function listSpreadsheets() {
  const files = DriveApp.searchFiles("mimeType='application/vnd.google-apps.spreadsheet' and trashed=false");
  const result = [];
  while (files.hasNext() && result.length < 200) {
    const f = files.next();
    result.push({ id: f.getId(), name: f.getName() });
  }
  return result.sort((a, b) => a.name.localeCompare(b.name));
}

function deleteUsers(sheetId) {
  const ss = SpreadsheetApp.openById(sheetId);
  const sheet = ss.getSheets()[0];
  const data = sheet.getDataRange().getValues(); // all the data in an array
  const out = { errors: [], success: 0 };

  for (let i = 1; i < data.length; i++) { // has a header row, start at 1
    const user = String(data[i][2]).trim(); // 3rd column has the email addresses
    if (!user) continue; // skip blank rows
    try {
      AdminDirectory.Users.remove(user);
      out.success++;
    } catch (err) {
      out.errors.push('Error on ' + user + ': ' + err.message);
    }
  }
  return out;
}
