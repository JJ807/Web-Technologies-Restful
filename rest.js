//pomocnicze zmienne globalne
var JSONResponse;
var IdMongo;
var request;

//prefiksy
window.indexedDB =
  window.indexedDB ||
  window.mozIndexedDB ||
  window.webkitIndexedDB ||
  window.msIndexedDB;

//ponizsza linia potrzebna jedynie dla rozpoznawania stałych z obiektow dla starszych przegladarek
window.IDBTransaction = window.IDBTransaction ||
  window.webkitIDBTransaction ||
  window.msIDBTransaction || { READ_WRITE: "readwrite" };

/**
 * Usuniecie lokalnej bazy na zaladowanie pliku i handlery dla tego requesta
 */
var DBDeleteRequest = indexedDB.deleteDatabase("WeatherDB");

DBDeleteRequest.onerror = function (event) {
  //console.log("Blad przy usuwaniu lokalnej bazy.");
};

DBDeleteRequest.onsuccess = function (event) {
  //console.log("Lokalna baza zostala poprawnie usunieta.");
  //console.log(event.result); // undefined
};

/**
 * Otwarcie lokalnej bazy na zaladowanie pliku i handlery dla tego requesta
 */
var localDB = indexedDB.open("WeatherDB", 3);

localDB.onsuccess = function (event) {
  var db = localDB.result;
  //console.log("Udalo sie otworzyc lokalna baze przegladarki.");
};

//na zaladowanie wiekszej bazy danych niz ta przetrzymywana obecnie
localDB.onupgradeneeded = function () {
  db = localDB.result;
  var objectStore = db.createObjectStore("dane_pogodowe", {
    keyPath: "id",
    autoIncrement: true,
  });
  objectStore.createIndex("dzien", "dzien");
  objectStore.createIndex("temp", "temp");
  objectStore.createIndex("opad", "opad");
  //console.log("Stworzona wieksza lokalna BD przegladarki.");
};

localDB.onerror = function (event) {
  //console.log("Nie udalo sie otworzyc lokalnej bazy przegladarki.");
};

//na zaladowanie strony -> wyswietl formularz z pogoda i menu
document.addEventListener("DOMContentLoaded", function () {
  display_weather_form(null); //formularz do wpisania danych
  display_logged_out(); //schowanie odpowiednich zakladek
  // document.getElementById('menu_form').classList.toggle('active');
});

//flaga okreslajaca czy uzytkownik online czy offline
var network = false;

/**
 * Sprawdzanie czy uzytkownik online/offline
 * @param {boolean} online
 */
function hasNetwork(online) {
  // Update the DOM to reflect the current status
  if (online) {
    network = true;
  } else {
    network = false;
  }
}

window.addEventListener("load", () => {
  hasNetwork(navigator.onLine);

  window.addEventListener("online", () => {
    hasNetwork(true);
  });

  window.addEventListener("offline", () => {
    hasNetwork(false);
  });
});

/**
 * Obsluga sesji uzytkownika na zaladowanie pliku
 */
session();

logged = false;

/**
 * Podswietlenie kliknietego przycisku
 * @param {id} id id podswietlanego elementu
 */
function highlight(id){
  var nav = document.getElementById('navbar');
  var elements = nav.getElementsByTagName('A');

  for(var i=0; i<elements.length; ++i){
    elements[i].className = elements[i].className.replace(/\bactive\b/g, "");
  }
  var el = document.getElementById(id);
  el.classList.toggle("active");
}

/**
 * Wyswietlenie na zalogowanie
 */
function display_logged_in() {
  //chowamy elementy menu na zalogowanie
  document.getElementById("menu_login").style.display = "none";
  document.getElementById("menu_reg").style.display = "none";
  document.getElementById("menu_localdb").style.display = "block";

  //odslaniamy inne
  document.getElementById("menu_chart").style.display = "block";
  document.getElementById("menu_tab_mongo").style.display = "block";
  document.getElementById("menu_sync").style.display = "block";
  document.getElementById("menu_logout").style.display = "block";
  logged = true;
}

/**
 * Wyswietlenie kiedy uzytkownik wylogowany
 */
function display_logged_out() {
  document.getElementById("menu_login").style.display = "block";
  document.getElementById("menu_reg").style.display = "block";
  document.getElementById("menu_localdb").style.display = "block";
  document.getElementById("menu_form").style.display = "block";

  //chowamy logowanie, synchro i wykres
  document.getElementById("menu_chart").style.display = "none";
  document.getElementById("menu_sync").style.display = "none";
  document.getElementById("menu_logout").style.display = "none";
  document.getElementById("menu_tab_mongo").style.display = "none";
}

/**
 * Wyswietlenie formularza z danymi do wpisania
 */
function display_weather_form(id) {
  if(id != null){
    highlight(id);
  }
  document.getElementById("weatherForm").style.display = "none";

  var form = "<div class='formularz'><form method='post' class='input'>";
  form +=
    "<h2>Dodaj dane pogodowe:</h2><input type='date' name='dzien'> Data<br/>" +
    "<input type='number' name='temp'> Temperatura [°C]<br/>" +
    "<input type='number' name='opad'> Opad [mm/m^2]<br/>";

  if (!logged) {
    form +=
      "<input type='button' value='Dodaj' onclick='insert_indexedDB(this.form)'></div>";
    document.getElementById("content").innerHTML = form;
  } else {
    form +=
      "<input type='button' value='Dodaj' onclick='insert_mongoDB(this.form)'></div>";
    document.getElementById("content").innerHTML = form;
  }
}

/**
 * Sprawdzenie poprawnosci wprowadzonych danych
 * @param {form} form formularz z wprowadzonymi danymi pogody
 */
function check_data(form) {
  //console.log("Sprawdzam dane..");
  var dane = {};
  dane.dzien = form.dzien.value;
  dane.temp = form.temp.value;
  dane.opad = form.opad.value;

  var wybranaData = new Date(dane.dzien);
  var czasObecny = new Date(Date.now());

  if (dane.temp == "" || dane.opad == "" || dane.dzien == "") {
    alert("Błąd! Uzupełnij poprawnie wszystkie pola.");
    return false;
  }
  if (wybranaData > czasObecny) {
    alert("Błąd! Podaj poprawną datę pomiaru.");
    return false;
  }
  if (isNaN(dane.temp) || dane.temp < -89.2 || dane.temp > 56.7) {
    alert("Błąd! Podaj poprawną wartość temperatury.");
    return false;
  }
  if (isNaN(dane.opad) || dane.opad < 0 || dane.opad > 1825) {
    alert("Błąd! Podaj poprawną wartość opadu.");
    return false;
  }
  //console.log("Dane wprowadzone poprawnie zwracam 'true'");
  return true;
}

/**
 * Wstawienie danych do bazy MongoDB
 * @param {form} form - formularz z wstawionymi danymi
 */
function insert_mongoDB(form) {
  var dane = {};
  dane.dzien = form.dzien.value;
  dane.temp = form.temp.value;
  dane.opad = form.opad.value;

  //konwertowanie JS Object na JSON
  JSONData = JSON.stringify(dane);
  reqObj = getRequestObject();
  reqObj.onreadystatechange = function () {
    if (reqObj.readyState == 4 && reqObj.status == 200) {
      JSONResponse = JSON.parse(reqObj.response);
      if (JSONResponse["status"] == "ok") {
        alert("Pomyślnie dodano dane.");
      } else {
        alert("Błąd bazy danych. Nie dodano danych.");
      }
    } else if (reqObj.readyState == 4 && reqObj.status == 400) {
      alert("Wprowadzone dane są niepoprawne.");
    }
  };
  reqObj.open(
    "POST",
    "rest/save",
    true
  );
  //wyslanie requesta z danymi w formacie JSON
  reqObj.send(JSONData);
}

/**
 * Wstawienie danych do lokalnej BD przegladarki
 * @param {form} form - formularz z wstawionymi danymi
 */
function insert_indexedDB(form) {
  if (check_data(form)) {
    var dane = {};
    dane.dzien = form.dzien.value;
    dane.temp = form.temp.value;
    dane.opad = form.opad.value;
    //console.log("Sprawdzilem dane wszystko ok");
    var objStore = db
      .transaction("dane_pogodowe", "readwrite")
      .objectStore("dane_pogodowe");
    //dodanie danych
    if (objStore.put(dane)) {
      alert("Dodano dane do lokalnej bazy przeglądarki.");
    }
  } else {
    //console.log("Zwrocono falsz - zle wprowadzone dane.");
  }
}

/**
 * Utworzenie tabeli z wynikami z lokalnej BD przegladarki
 */
function display_table(id) {
  if(id != null) {
    highlight(id);
  }

  document.getElementById("content").innerHTML = "";
  document.getElementById("content").style.padding = "0";
  document.getElementById("weatherForm").style.display = "none";

  var objectStore = db
    .transaction("dane_pogodowe")
    .objectStore("dane_pogodowe");
  table =
    "<div class='table-wrapper'><table class='resultTable'>" +
    "<thead><tr><th>ID pomiaru</th><th>Data</th><th>Temperatura</th><th>Opad</th></tr></thead><tbody>";

  //utworzenie kursora
  request = objectStore.openCursor();

  request.onsuccess = function () {
    var cursor = request.result;
    if (cursor) {
      const klucz = cursor.primaryKey;
      const dzien = cursor.value.dzien;
      const temp = cursor.value.temp;
      const opad = cursor.value.opad;
      table +=
        "<tr><td>" +
        klucz +
        "</td><td>" +
        dzien +
        "</td><td>" +
        temp +
        "</td><td>" +
        opad +
        "</td></tr>";

      //przejscie do kolejnej pozycji
      cursor.continue();
    } else {
      table += "</tbody></table></div>";
      document.getElementById("content").innerHTML = table;
    }
  };
}

/**
 * Synchronizacja danych lokalnej BD i MongoDB
 */
function synchro() {
  document.getElementById("weatherForm").style.display = "none";

  var licznik = 0;

  var obj = db
    .transaction("dane_pogodowe", "readwrite")
    .objectStore("dane_pogodowe");

  obj.openCursor().onerror = function (event) {
    alert("Błąd przy otwieraniu kursora.");
  };

  obj.openCursor().onsuccess = function (event) {
    var cursor = event.target.result;

    if (cursor) {
      var dane = {};
      dane.dzien = cursor.value.dzien;
      dane.temp = cursor.value.temp;
      dane.opad = cursor.value.opad;

      JSONData = JSON.stringify(dane);
      reqObj = getRequestObject();

      reqObj.onreadystatechange = function () {
        if (reqObj.readyState == 4 && reqObj.status == 200) {
          JSONResponse = JSON.parse(reqObj.response);
          if (JSONResponse["status"] == "ok") {
            alert("Synchronizacja danych zakończona pomyślnie.");
          }
        }
      };
      reqObj.open(
        "POST",
        "rest/save",
        true
      );
      reqObj.send(JSONData);
      const del = cursor.delete();
      del.onsuccess = function () {
        //console.log("Usunięto rekord, na który wskazywał kursor.");
      };
      licznik += 1;
      cursor.continue();
    } else if (licznik == 0) {
      alert(
        "Lokalna baza przeglądarki jest pusta - nie ma czego synchronizować."
      );
    }
    // na koniec wyswietlenie danych bazy mongoDB
    display_table_mongo(null);
  };
}

/**
 * Stworzenie formularza z rejestracja
 */
function display_register_form(id) {
  if(id != null) {
    highlight(id);
  }
 
  var regform =
    "<div class='formularz'><form method='post' class = 'input'>";
  regform +=
    "<h2>Zarejestruj się</h2><input type='text' name='nazwa' placeholder='Nazwa użytkownika' required ><br>";
  regform +=
    "<input type='password' name='haslo' placeholder='Hasło' required><br>";
  regform +=
    "<input type='button' value='Zarejestruj' onclick='register(this.form)'>";
  regform += "</form>";
  document.getElementById("content").innerHTML = regform;
}

/**
 * Stworzenie formularza z logowaniem
 */
function display_login_form(id) {
  if(id != null) {
    highlight(id);
  }
  var logform =
    "<div class='formularz'><form method='post' class = 'input'>";
  logform +=
    "<h2>Zaloguj się</h2><input type='text' name='nazwa' placeholder='Nazwa użytkownika' required ><br>";
  logform +=
    "<input type='password' name='haslo' placeholder='Hasło' required><br>";
  logform +=
    "<input type='button' value='Zaloguj' onclick='log_in(this.form)'>";
  logform += "</form>";
  document.getElementById("content").innerHTML = logform;
}

/**
 * Zarejestrowanie uzytkownika
 * @param {form} form formularz z nazwa i haslem uzytkownika
 */
function register(form) {
  if (network) {
    var user = {};
    user.username = form.nazwa.value;
    user.password = form.haslo.value;

    JSONData = JSON.stringify(user);
    reqObj = getRequestObject();

    reqObj.onreadystatechange = function () {
      if (reqObj.readyState == 4 && reqObj.status == 200) {
        JSONResponse = JSON.parse(reqObj.response);
        if (JSONResponse["status"] == "ok") {
          alert("Zarejestrowano.");
        } else {
          alert("Wprowadzona nazwa użytkownika już istnieje.");
        }
      }
    };
    reqObj.open(
      "POST",
      "rest/register",
      true
    );
    reqObj.send(JSONData);
  } else {
    alert("Brak możliwości rejestracji - jesteś w trybie offline.");
  }
}

/**
 * Zalogowanie uzytkownika
 * @param {form} form formularz z nazwa i haslem uzytkownika
 */
function log_in(form) {
  if (network) {
    if (form.nazwa.value == "" || form.haslo.value == "") {
      alert("Pola nie mogą być puste.");
      return;
    }
    var user = {};
    user.username = form.nazwa.value;
    user.password = form.haslo.value;

    JSONData = JSON.stringify(user);
    reqObj = getRequestObject();

    reqObj.onreadystatechange = function () {
      if (reqObj.readyState == 4 && reqObj.status == 200) {
        JSONResponse = JSON.parse(reqObj.response);
        if (JSONResponse["status"] == "ok") {
          display_logged_in(); //udostepnij nowe przyciski
          set_id_session(JSONResponse["ID_sesji"]); //ustaw id sesji
          alert("Zalogowano.");
          document.getElementById("content").innerHTML = "";
          document.getElementById("content").style.padding = "0";
          display_weather_form(null); //wyswietl formularz z danymi do wprowadzenia
        } else alert("Podano złe dane.");
      }
    };
    reqObj.open(
      "POST",
      "rest/login",
      true
    );
    reqObj.send(JSONData);
  } else {
    alert("Brak możliwości zalogowania - jesteś w trybie offline.");
  }
}

/**
 * Wylogowanie uzytkownika
 */
function log_out() {
  document.getElementById("weatherForm").style.display = "none";

  //usuwamy zawartosc
  document.getElementById("content").innerHTML = "";

  var sessID = get_id_session();
  var cookies = {};
  cookies.ID_sesji = sessID;
  JSONData = JSON.stringify(cookies);
  reqObj = getRequestObject();

  reqObj.onreadystatechange = function () {
    if (reqObj.readyState == 4 && reqObj.status == 200) {
      JSONResponse = JSON.parse(reqObj.response);
      if (JSONResponse["status"] == "ok") {
        display_logged_out(); //wyloguj
        set_id_session(""); //ustaw id sesji
        alert("Wylogowano.");
        display_login_form(); //wyswietl formularz do zalogowania
        logged = false;
      }
    }
  };
  reqObj.open(
    "POST",
    "rest/logout",
    true
  );
  reqObj.send(JSONData);
}

/**
 * Analiza danych - stworzenie wykresu i wyswietlenie go
 */
function analyze_data(id) {
  if(id != null) {
    highlight(id);
  }
  document.getElementById("content").innerHTML = "";
  document.getElementById("content").style.padding = "0";
  document.getElementById("weatherForm").style.display = "block";

  reqObj = getRequestObject();
  reqObj.onreadystatechange = function () {
    if (reqObj.readyState == 4 && reqObj.status == 200) {
      JSONResponse = JSON.parse(reqObj.response);

      tempTab = [];
      opadTab = [];

      for (var id in JSONResponse) {
        newDate = new Date(JSONResponse[id]["dzien"]);
        dateZero = new Date(
          newDate.getFullYear(),
          newDate.getMonth(),
          newDate.getDate()
        );

        //dodawanie elementow do tablicy
        tempTab.push({ x: dateZero, y: Number(JSONResponse[id]["temp"]) });
        opadTab.push({ x: dateZero, y: Number(JSONResponse[id]["opad"]) });
      }

      //narysuj wykres od przeslanych danych
      draw_graph(tempTab, opadTab);
    }
  };

  reqObj.open(
    "GET",
    "rest/list",
    true
  );
  reqObj.send(null);
}

/**
 * Przegladanie danych tabeli w trybie online
 */
function display_table_mongo(id) {
  if(id != null) {
    highlight(id);
  }
  document.getElementById("content").innerHTML = "";
  document.getElementById("content").style.padding = "0";
  document.getElementById("weatherForm").style.display = "none";

  table =
    "<div class='table-wrapper'><table class='resultTable'>" +
    "<thead><tr><th>ID pomiaru</th><th>Data</th><th>Temperatura</th><th>Opad</th></tr></thead><tbody>";

  reqObj = getRequestObject();
  reqObj.onreadystatechange = function () {
    if (reqObj.readyState == 4 && reqObj.status == 200) {
      JSONResponse = JSON.parse(reqObj.response);

      for (var id in JSONResponse) {
        newDate = new Date(JSONResponse[id]["dzien"]);
        dateZero = new Date(
          newDate.getFullYear(),
          newDate.getMonth(),
          newDate.getDate()
        );

        table +=
          "<tr><td>" +
          id +
          "</td><td>" +
          dateZero +
          "</td><td>" +
          Number(JSONResponse[id]["temp"]) +
          "</td><td>" +
          Number(JSONResponse[id]["opad"]) +
          "</td></tr>";
      }

      table += "</tbody></table></div>";
      document.getElementById("content").innerHTML = table;
    }
  };

  reqObj.open(
    "GET",
    "rest/list",
    true
  );
  reqObj.send(null);
}

/**
 * Narysowanie wykresu
 * @param {array} tempData
 * @param {array} rainData
 */
function draw_graph(tempData, rainData) {
  document.getElementById("weatherForm").style.display = "block";
  var objStore = db.transaction("dane_pogodowe").objectStore("dane_pogodowe");
  request = objStore.openCursor();

  request.onsuccess = function () {
    let cursor = request.result;
    if (cursor) {
      const klucz = cursor.primaryKey;
      const dzien = cursor.value.dzien;
      const temp = cursor.value.temp;
      const opad = cursor.value.opad;
      cursor.continue();
    }
  };

  var graph = new CanvasJS.Chart("weatherForm", {
    animationEnabled: true,
    title: {
      text: "Wykres średniej temperatury i opadu (na dzień)",
      color: "black",
    },
    axisX: {
      valueFormatString: "DD MMM,YY",
    },
    axisY: [
      {
        includeZero: false,
        title: "Temperatura [°C]",
        lineColor: "orange",
        tickColor: "orange",
        labelFontColor: "orange",
        titleFontColor: "orange",
        lineThickness: 2,
      },
      {
        includeZero: false,
        title: "Opad [mm/m^2]",
        lineColor: "darkblue",
        tickColor: "darkblue",
        labelFontColor: "darkblue",
        titleFontColor: "darkblue",
        lineThickness: 2,
      },
    ],
    legend: {
      cursor: "pointer",
      fontSize: 12,
      itemclick: toggleDataSeries,
    },
    toolTip: {
      shared: true,
    },
    data: [
      {
        name: "Temperatura",
        color: "orange",
        type: "spline",
        yValueFormatString: "#0.## °C",
        showInLegend: true,
        dataPoints: tempData,
      },
      {
        axisYIndex: 1,
        name: "Opad",
        color: "darkblue",
        type: "spline",
        yValueFormatString: "#0.## mm/m^2",
        showInLegend: true,
        dataPoints: rainData,
      },
    ],
  });
  graph.render();

  function toggleDataSeries(e) {
    if (typeof e.dataSeries.visible === "undefined" || e.dataSeries.visible) {
      e.dataSeries.visible = false;
    } else {
      e.dataSeries.visible = true;
    }
    graph.render();
  }
}

/**
 * Stworzenie Request Object
 */
function getRequestObject() {
  if (window.ActiveXObject) {
    return new ActiveXObject("Microsoft.XMLHTTP");
  } else if (window.XMLHttpRequest) {
    return new XMLHttpRequest();
  } else {
    return null;
  }
}

/**
 * Pobranie id sesji uzytkownika
 */
function get_id_session() {
  var temp;
  var cookies;
  cookies = document.cookie.split(";");
  for (var i = 0; i < cookies.length; ++i) {
    temp = cookies[i];
    while (temp.charAt(0) == " ") {
      temp = temp.substring(1, temp.length);
    }
    if (temp.indexOf("ID_sesji=") == 0) {
      return temp.substring("ID_sesji=".length, temp.length);
    }
  }
  return "";
}

/**
 * Obsluga sesji uzytkownika
 */
function session() {
  var arr = {};
  var sessId = get_id_session();
  arr.ID_sesji = sessId;

  JSONData = JSON.stringify(arr);
  reqObj = getRequestObject();

  reqObj.onreadystatechange = function () {
    if (
      reqObj.readyState == 4 &&
      (reqObj.status == 200 || reqObj.status == 400)
    ) {
      JSONResponse = JSON.parse(reqObj.response);
      if (JSONResponse["status"] == "ok") {
        display_logged_in();
      }
    }
  };
  reqObj.open(
    "POST",
    "rest/session",
    true
  );
  reqObj.send(JSONData);
}

/**
 * Ustawienie ID sesji
 */
function set_id_session(value) {
  document.cookie = "ID_sesji=" + value + "; path=/";
}
