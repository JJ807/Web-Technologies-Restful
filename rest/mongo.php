<?php
phpinfo();
class DbMongo
{
  // private $collUser = "uzytkownik";
  // private $collSession = "sesja";
  // private $collWeather = "dane_pogodowe";
  private $UserColl;
  private $SessionColl;
  private $WeatherColl;

  private $conn;


  function __construct()
  {
    
    $this->conn = new MongoDB\Client(
    'mongodb+srv://projekt2user:projekt2userpass@projekt2.n8hwc.mongodb.net/database?retryWrites=true&w=majority');
    $db = $this->conn->test;

    $this->UserColl = $this->conn->uzytkownik;
    $this->SessionColl = $this->conn->sesja;
    $this->WeatherColl = $this->conn->dane_pogodowe;
  }

  function select()
  {
    $cursor = $this->WeatherColl->find();
    $table = iterator_to_array($cursor);
    return $table;
  }

  function insert($data)
  {
    $res = $this->WeatherColl->insertOne($data);
    return $res;
  }

  function register($user)
  {
    $count = $this->UserColl->count(['username' => $user['username']]);
    
    //dodaj uzytkownika jesli juz takiego nie ma 
    //jesli jest -> zwroc pusta zmienna 
    if ($count == 0) {
      $ret = $this->UserColl->insertOne($user);
    }
    return $ret;
  }

  public function login($array)
  {
    $name = $array['username'];
    $pass = $array['password'];
    $count =  $this->UserColl->count(['username' => $name, 'password' => $pass]);

    //jesli uzytkownik o takim nicku i hasle nieznaleziony -> zwroc false
    //przeciwnie - zwroc wynik uzycia fk insertOne(), czyli jesli sie uda to true, jesli nie to false
    if ($count == 0)
      $ret = false;
    else {
      //zakodowanie sesji
      $IdSession = md5(uniqid($name, true));
      $time = date('Y-m-d H:i:s', time());
      $rec = array('ID_sesji' => $IdSession, 'start' => $time);
      $ret = $this->SessionColl->insertOne($rec);
    }
    // return $IdSession;
    return $ret;
  }


  function session($arr)
  {
    //znajdz rekord o danym ID_sesji
    $temp =  $this->SessionColl->findOne(array('ID_sesji' => $arr['ID_sesji']));
    if ($temp != NULL) {
      $poczatek = $temp['start'];
      $dataPoczatku = DateTime::createFromFormat("Y-m-d H:i:s", $poczatek);
      $koniec = new DateTime('now');
      $czasTrwania = $koniec->getTimestamp() - $dataPoczatku->getTimestamp();

      //jesli sesja nieaktualna
      if ($czasTrwania > (10 * 60)) {
        $this->SessionColl->remove(array('ID_sesji' => $arr['ID_sesji']));
        return false;
      }
    } else {
      //nieznaleziony
      return false;
    }
    //znaleziony i aktualny
    return true;
  }

  public function logout($sesja)
  {
    //znajdz dane ID_sesji - jesli znalezione, usun je i zwroc true
    $temp =  $this->SessionColl->find(array('ID_sesji' => $sesja));
    if ($temp != NULL) {
      $this->SessionColl->deleteOne(array('ID_sesji' => $sesja));
      return true;
    } else
      return false;
  }
}
