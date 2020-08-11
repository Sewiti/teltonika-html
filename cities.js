// init
var params;
var countryId;

function init() {
  params = {};

  var url = new URLSearchParams(window.location.search);

  countryId = url.get('id');
  document.getElementById('countryName').innerText = url.get('name');

  updateGoBack();
  updatePagesView();
  updateCities();
}

function updateGoBack() {
  var url = new URLSearchParams(window.location.search);

  var temp = {};
  const prefix = 'country_';

  if (url.has(prefix + 'order')) { temp.order = url.get(prefix + 'order'); }
  if (url.has(prefix + 'text'))  { temp.text  = url.get(prefix + 'text');  }
  if (url.has(prefix + 'date'))  { temp.date  = url.get(prefix + 'date');  }
  if (url.has(prefix + 'page'))  { temp.page  = url.get(prefix + 'page');  }

  // for fun
  if (params.vw || url.get(prefix + 'vw')) {
    temp.vw = true;
    vw();
  }

  document.getElementById('goBack').href = "index.html?" + formatParams(temp, '', false);
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


// Cities
function updateCities() {
  request(
    'GET',
    'https://akademija.teltonika.lt/api2/cities/' + countryId,
    params,
    (status, response) => {
      if (status !== 200) {
        // console.log('Error');
        return;
      }

      var cities = response; // count i res ??

      updatePageForwardView(cities.length);
      updateCitiesTable(cities);
    }
  );
}

function updateCitiesTable(cities) {
  var table = document.getElementById('citiesTable');

  while (table.rows.length > 1) {
    table.deleteRow(1);
  }

  if (cities.length == 0) {
    var row = table.insertRow();
    var cell = row.insertCell(0);

    // cell.classList.add('noElements');
    cell.innerText = 'Miestų nėra.';
    cell.colSpan = 5;
  }

  for (var i in cities) {
    var row = table.insertRow();

    row.insertCell(0).innerText = cities[i].name;
    row.insertCell(1).innerText = cities[i].area + ' km²';
    row.insertCell(2).innerText = cities[i].population;
    row.insertCell(3).innerText = cities[i].postcode;

    var actions = row.insertCell(4);
    actions.innerHTML = `
      <button class="icon-button" onclick='editCityDialog(` + JSON.stringify(cities[i]) + `)'>
        <img src="assets/edit.svg"/>
      </button>
      <button class="delete icon-button" onclick='deleteCityDialog(` + JSON.stringify(cities[i]) + `)'>
        <img src="assets/delete.svg"/>
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
  updateCities();
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
    updateGoBack();
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
  updateCities();
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
  updateCities();
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
    'https://akademija.teltonika.lt/api2/cities/' + countryId,
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
function newCityDialog() { showDialog(); }

function editCityDialog(city) { showDialog(true, city); }

function deleteCityDialog(city) {
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

  document.getElementById('title').innerText = 'Ar tikrai norite ištrinti "' + city.name +'" ?';
  dialogSubmit = function() {
    request(
      'DELETE',
      'https://akademija.teltonika.lt/api2/cities/' + city.id,
      null,
      function (status, response) {
        hideDialog();

        if (status !== 200) {
          pushNotification('Nepavyko ištrinti miesto');
          return;
        }

        pushNotification('Miestas sėkmingai ištrintas');
        updateCities();
      }
    );
  };
}

var dialogSubmit;
function showDialog(isEdit = false, city = null) {
  var area = document.getElementById('dialog-area');
  if (area.classList.contains('active')) { return; }
  area.classList.add('active');
  area.classList.remove('delete');

  var window = document.getElementById('dialog-window');
  window.innerHTML = `
    <div class="bar">
      <span id="title">Naujas miestas</span>
    </div>

    <form onsubmit="dialogSubmit(); return false">
      <div>
        <span class="title">Pavadinimas</span>
        <input required minlength="3" maxlength="50" pattern="[A-Za-zĄČĄĘĖĮŠŲŪŽąččęėęįšųūž ]+" id="name" type="text" placeholder="Vilnius">
      </div>
      <div>
        <span class="title">Užimamas plotas, km²</span>
        <input required min="0" max="500000000" step="0.001" id="area" type="number" placeholder="401.52">
      </div>
      <div>
        <span class="title">Gyventojų skaičius</span>
        <input required min="1" max="10000000000" id="population" type="number" placeholder="580020">
      </div>
      <div>
        <span class="title">Pašto kodas</span>
        <input required pattern="[A-Za-z0-9]{2,3}[0-9]{0,2}[- ]?[0-9]{2,5}" id="postcode" type="text" placeholder="LT-01001">
      </div>
      <div class="dialog-buttons">
        <button type="button" onclick="hideDialog()">Uždaryti</button>
        <button type="submit" id="submit">Sukurti</button>
      </div>
    </form>
  `;

  if (isEdit) {
    document.getElementById('title').innerText = 'Redaguoti miestą';
    document.getElementById('submit').innerText = 'Išsaugoti';

    document.getElementById('name').value = city.name;
    document.getElementById('area').value = city.area;
    document.getElementById('population').value = city.population;
    document.getElementById('postcode').value = city.postcode;
  }

  dialogSubmit = function() {
    var name = document.getElementById('name');
    var area = document.getElementById('area');
    var population = document.getElementById('population');
    var postcode = document.getElementById('postcode');

    request(
      (isEdit) ? 'PUT' : 'POST',
      'https://akademija.teltonika.lt/api2/cities' + (isEdit ? '/' + city.id : ''),
      {
        name: name.value,
        area: area.value,
        population: population.value,
        postcode: postcode.value,
        country_id: countryId
      },
      function (status, response) {
        hideDialog();

        if (status !== 200) {
          pushNotification(isEdit ? 'Nepavyko išsaugoti miesto' : 'Nepavyko sukurti miesto');
          return;
        }

        pushNotification(isEdit ? 'Miestas sėkmingai išsaugotas' : 'Miestas sėkmingai sukurtas');
        updateCities();
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
