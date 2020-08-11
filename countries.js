// init
var params;

function init() {
  var url = new URLSearchParams(window.location.search);

  params = {};

  if (url.has('order')) { params.order =  url.get('order'); }
  if (url.has('text'))  { params.text  =  url.get('text'); document.getElementById('search').value = params.text; }
  if (url.has('date'))  { params.date  =  url.get('date'); document.getElementById('date').value = params.date; }
  if (url.has('page'))  { params.page  = +url.get('page'); }

  if (url.get('vw')) vw();  // for fun

  updateSortIndex();
  updatePagesView();
  updateCountries();
}
init();


// HTTP
function formatParams(params, prefix = '', filter = true) {
  var combined = [];

  for (var key in params) {
    // filter out vw (vw is for fun)
    if ((filter && key !== 'vw') || !filter) {
      if (params[key]) {
        combined.push(encodeURIComponent(prefix + key) + '=' + encodeURIComponent(params[key]));
      }
    }
  }

  return combined.join('&');
}

function request(type, url, params, callback) {
  var http = new XMLHttpRequest();

  const _url = params ? url + '?' + formatParams(params) : url;

  http.open(type, _url);
  http.responseType = 'json';
  http.onload = function() {
    // console.log({type, url: _url, status: http.status, response: http.response});
    callback(http.status, http.response);
  };

  http.send();
};


// Countries
function updateCountries() {
  request(
    'GET',
    'https://akademija.teltonika.lt/api2/countries',
    params,
    (status, response) => {
      if (status !== 200) {
        pushNotification('Nepavyko gauti šalių');
        // console.log(response);
        return;
      }

      var countries = response.countires; // count i res ??

      updatePageForwardView(response.count);
      updateCountriesTable(countries);
    }
  );
}

function updateCountriesTable(countries) {
  var table = document.getElementById('countriesTable');

  while (table.rows.length > 1) {
    table.deleteRow(1);
  }

  // var placeholder = document.getElementById('noElements');
  // placeholder.hidden = countries.length > 0;
  if (countries.length == 0) {
    var row = table.insertRow();
    var cell = row.insertCell(0);

    // cell.classList.add('noElements');
    cell.innerText = 'Šalių nėra.';
    cell.colSpan = 5;
  }

  for (var i in countries) {
    var row = table.insertRow();

    var name = row.insertCell(0)
    name.classList.add('nameCell');
    name.innerHTML =
      '<a class="city-link" href="cities.html?id=' + countries[i].id + '&name=' + countries[i].name + '&' + formatParams(params, 'country_', false) + '">' +
      countries[i].name +
      '</a>';

    row.insertCell(1).innerText = countries[i].area + ' km²';
    row.insertCell(2).innerText = countries[i].population;
    row.insertCell(3).innerText = countries[i].calling_code;

    var actions = row.insertCell(4);
    actions.innerHTML = `
      <button class="icon-button" onclick='editCountryDialog(` + JSON.stringify(countries[i]) + `)'>
        <img src="assets/edit.svg">
      </button>
      <button class="icon-button" onclick='deleteCountryDialog(` + JSON.stringify(countries[i]) + `)'>
        <img src="assets/delete.svg">
      </button>
    `;
  }
}


// Sorting
function sortChanged() {
  // Tri-state order
  params.order = (
    !params.order ?
    'asc' :
    (params.order == 'asc' ? 'desc' : null)
  );

  updateSortIndex();
  updateCountries();
}

function updateSortIndex() {
  document.getElementById('sortingIndex').innerText = (params.order ? (params.order === 'asc' ? 'A-Z' : 'Z-A') : '');
}


// Filter
function searchChanged() {
  var search = document.getElementById('search');
  params.text = search ? search.value : '';

  if (search && !params.vw && search.value.toLowerCase() === 'vaporwave')
  {
    vw();
    pushNotification('(ﾉ◕ヮ◕)ﾉ*:･ﾟ✧');
  }

  filterChanged();
}

function dateChanged() {
  var date = document.getElementById('date');
  params.date = date ? date.value : '';

  filterChanged();
}

function filterChanged() {
  params.page = 1;
  updatePagesView();
  updateCountries();
}


// Paginator
function changePage(addPages) {
  params.page = (
    params.page ?
    params.page + addPages :
    (
      addPages > 0 ? 2 : 1
    )
  );

  updatePagesView();
  updateCountries();
}

function updatePagesView() {
  if (!params.page) params.page = 1;

  document.getElementById('pageBack').disabled = params.page <= 1;
  document.getElementById('page').innerText = params.page;
}

function updatePageForwardView(elementsCount) {
  var pageForward = document.getElementById('pageForward');

  if (elementsCount < 10) {
    pageForward.disabled = true;
    return;
  }

  var temp = {...params};
  temp.page = temp.page ? temp.page+1 : 2;

  request(
    'GET',
    'https://akademija.teltonika.lt/api2/countries',
    temp,
    (status, response) => {
      if (status !== 200) {
        // console.log('Error');
        return;
      }
      pageForward.disabled = response.count <= 0;
    }
  );
}


// Notification
function pushNotification(message) {
  var area = document.getElementById('notifications-area');
  var notification = document.createElement('div');

  var fadeout = function() {
    notification.style.opacity = 0;
    setTimeout(() => { notification.remove(); }, 333);
  };

  notification.classList.add('notification');
  notification.innerText = message;
  notification.onclick = fadeout;

  area.appendChild(notification);
  setTimeout(fadeout, 3000);
}


// Dialog
function newCountryDialog() { showDialog(); }

function editCountryDialog(country) { showDialog(true, country); }

function deleteCountryDialog(country) {
  var area = document.getElementById('dialog-area');
  if (area.classList.contains('active')) { return; }
  area.classList.add('active');
  area.classList.add('delete');

  var window = document.getElementById('dialog-window');
  window.innerHTML = `
    <div class="bar">
      <span id="title">Ar tikrai norite ištrinti?</span>
    </div>

    <form onsubmit="dialogSubmit(); return false">
      <div class="dialog-buttons">
        <button type="button" onclick="hideDialog()">Uždaryti</button>
        <button type="submit" class="delete" id="submit">Ištrinti</button>
      </div>
    </form>
  `;

  document.getElementById('title').innerText = 'Ar tikrai norite ištrinti "' + country.name +'" ?';
  dialogSubmit = function() {
    request(
      'DELETE',
      'https://akademija.teltonika.lt/api2/countries/' + country.id,
      null,
      function (status, response) {
        hideDialog();

        if (status !== 200) {
          pushNotification('Nepavyko ištrinti šalies');
          return;
        }

        pushNotification('Šalis sėkmingai ištrinta');
        updateCountries();
      }
    );
  };
}

var dialogSubmit;
function showDialog(isEdit = false, country = null) {
  var area = document.getElementById('dialog-area');
  if (area.classList.contains('active')) { return; }
  area.classList.add('active');
  area.classList.remove('delete');

  var window = document.getElementById('dialog-window');
  window.innerHTML = `
    <div class="bar">
      <span id="title">Nauja šalis</span>
    </div>

    <form onsubmit="dialogSubmit(); return false">
      <div>
        <span class="title">Pavadinimas</span>
        <input required minlength="3" maxlength="50" pattern="[A-Za-zĄČĄĘĖĮŠŲŪŽąččęėęįšųūž ]+" id="name" type="text" placeholder="Lietuva">
      </div>
      <div>
        <span class="title">Užimamas plotas, km²</span>
        <input required min="0" step="0.001" id="area" type="number" placeholder="65300">
      </div>
      <div>
        <span class="title">Gyventojų skaičius</span>
        <input required min="1" id="population" type="number" placeholder="2795000">
      </div>
      <div>
        <span class="title">Šalies tel. kodas</span>
        <input required min="0" max="9999" id="callingCode" type="number" placeholder="370">
      </div>
      <div class="dialog-buttons">
        <button type="button" onclick="hideDialog()">Uždaryti</button>
        <button type="submit" id="submit">Sukurti</button>
      </div>
    </form>
  `;

  if (isEdit) {
    document.getElementById('title').innerText = 'Redaguoti šalį';
    document.getElementById('submit').innerText = 'Išsaugoti';

    document.getElementById('name').value = country.name;
    document.getElementById('area').value = country.area;
    document.getElementById('population').value = country.population;
    document.getElementById('callingCode').value = +country.calling_code;
  }

  dialogSubmit = function() {
    // console.log('');

    var name = document.getElementById('name');
    var area = document.getElementById('area');
    var population = document.getElementById('population');
    var callingCode = document.getElementById('callingCode');

    request(
      (isEdit) ? 'PUT' : 'POST',
      'https://akademija.teltonika.lt/api2/countries' + (isEdit ? '/' + country.id : ''),
      {
        name: name.value,
        area: area.value,
        population: population.value,
        calling_code: '+' + (+callingCode.value).toString()
      },
      function (status, response) {
        hideDialog();

        if (status !== 200) {
          pushNotification(isEdit ? 'Nepavyko išsaugoti šalies' : 'Nepavyko sukurti šalies');
          return;
        }

        pushNotification(isEdit ? 'Šalis sėkmingai išsaugota' : 'Šalis sėkmingai sukurta');
        updateCountries();
      }
    );
  };
}

function hideDialog() {
  var area = document.getElementById('dialog-area');
  area.classList.remove('active');
}


// purely for fun
function vw() {
  params.vw = true;

  var addVW = function(elements) {
    for (var i = 0; i < elements.length; i++) {
      elements[i].classList.add('vw');
    }
  };

  // addVW(document.getElementsByTagName('body'));
  addVW(document.getElementsByTagName('tbody'));
  addVW(document.getElementsByClassName('bar'));
  addVW(document.getElementsByClassName('sub-bar'));
  addVW(document.getElementsByClassName('icon-button'));
  addVW(document.getElementsByClassName('bigger-icon-button'));
  addVW([document.getElementById('dialog-window')]);
  addVW([document.getElementById('notifications-area')]);
}
