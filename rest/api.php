<?php
phpinfo();
require './app/lib/vendor/autoload.php';
require_once("rest.php");
require_once("mongo.php");

class API extends REST
{
    public $data = "";

    /**
     * Konstruktor
     */
    public function __construct()
    {
        parent::__construct();        // wywolanie konstruktora z klasy REST
        $this->database = new DbMongo();    // inicjalizujemy baze DbMongo 
    }

    /**
     * Wywolanie funkcji z "_" przed nazwa
     */
    public function processApi()
    {
        $func = "_" . $this->_endpoint;
        if ((int)method_exists($this, $func) > 0) {
            $this->$func();
        } else {
            $this->response('Page not found', 404);
        }
    }

    /**
     * Konwertowanie na obiekt JSON
     */
    private function json($data)
    {
        if (is_array($data)) {
            return json_encode($data);
        }
    }

    /**
     * Obsluga danych atmosferycznych
     */
    private function _list()
    {
        if ($this->get_request_method() != "GET") {
            $this->response('', 406);
        }
        try {
            // wynik z funkcji select(), zawierajacy info o pogodzie 
            $res = $this->database->select();
            $this->response($this->json($res), 200);
        } catch (Exception $e) {
            $this->response('', 400);
        }
    }

    /**
     * Obsluga zapisu danych do bazy
     */
    private function _save()
    {
        if ($this->get_request_method() != "POST")
            $this->response('', 406);

        if (!empty($this->_request)) {
            try {
                $jsonArr = json_decode($this->_request, true);

                foreach ($jsonArr as $key => $val) {
                    if ($val == '') {
                        $res = array('status' => 'failed', 'msg' => 'Missing data');
                        $this->response($this->json($res), 400);
                    }
                }

                //wstawianie danych do bazy czyli obiektu klasy DbMongo
                $ins = $this->database->insert($jsonArr);
                if ($ins) {
                    $res = array('status' => 'ok');
                    $this->response($this->json($res), 200);
                } else {
                    $res = array('status' => 'Data was not inserted');
                    $this->response($this->json($res), 200);
                }
            } catch (Exception $e) {
                $err = array('status' => "failed", "msg" => "Exception ocurred");
                $this->response('', 400);
            }
        } else {
            $err = array('status' => "failed", "msg" => "Sent data is invalid");
            $this->response($this->json($err), 400);
        }
    }

    /**
     * Obsluga rejestracji
     */
    private function _register()
    {
        if ($this->get_request_method() != "POST")
            $this->response('', 406);
        if (!empty($this->_request)) {
            try {
                $jsonArr = json_decode($this->_request, true);
                //brak danych
                foreach ($jsonArr as $key => $val) {
                    if ($val == '') {
                        $res = array('status' => 'failed', 'msg' => 'Missing data');
                        $this->response($this->json($res), 400);
                    }
                }
                //stan rejestracji
                //jesli status jest 'ok' uzytkownik zostanie zarejestrowany
                //jesli inaczej oznacza to ze uzytkownik o takiej nazwie juz istnieje
                $reg = $this->database->register($jsonArr);
                if ($reg) {
                    $res = array('status' => 'ok');
                    $this->response($this->json($res), 200);
                } else {
                    $res = array('status' => 'Such name already taken');
                    $this->response($this->json($res), 200);
                }
            } catch (Exception $e) {
                $err = array('status' => "failed", "msg" => "Exception occured");
                $this->response('', 400);
            }
        } else {
            $err = array('status' => "failed", "msg" => "Sent data is invalid");
            $this->response($this->json($err), 400);
        }
    }

      /**
     * Obsluga logowania
     */
    private function _login()
    {
        if ($this->get_request_method() != "POST")
            $this->response('', 406);
        if (!empty($this->_request)) {
            try {
                $jsonArr = json_decode($this->_request, true);
                foreach ($jsonArr as $key => $val) {
                    if ($val == '') {
                        $res= array('status' => 'failed', 'msg' => 'Missing data');
                        $this->response($this->json($res), 400);
                    }
                }

                //stan logowania
                $log = $this->database->login($jsonArr);
                if ($log) {
                    $res = array('status' => 'ok', 'ID_sesji' => $log);
                    $this->response($this->json($res), 200);
                } else {
                    $res = array('status' => 'Validation failed');
                    $this->response($this->json($res), 200);
                }
            } catch (Exception $e) {
                $err = array('status' => "failed", "msg" => "Exception occured");
                $this->response('', 400);
            }
        } else {
            $err = array('status' => "failed", "msg" => "Sent data is invalid");
            $this->response($this->json($err), 400);
        }
    }

     /**
     * Obsluga wylogowania
     */
    private function _logout()
    {
        if ($this->get_request_method() != "POST")
            $this->response('', 406);
        if (!empty($this->_request)) {
            try {
                $jsonArr = json_decode($this->_request, true);
                
                //stan wylogowania
                $logOut = $this->database->logout($jsonArr['ID_sesji']);
                if ($logOut) {
                    $res = array('status' => 'ok');
                    $this->response($this->json($res), 200);
                } else {
                    $res = array('status' => 'Wrong ID of the session');
                    $this->response($this->json($res), 200);
                }
            } catch (Exception $e) {
                $this->response('', 400);
            }
        } else {
            $err = array('status' => "failed", "msg" => "Session failed");
            $this->response($this->json($err), 400);
        }
    }

    /**
     * Obsluga sesji uzytkownika
     */
    private function _session()
    {
        if ($this->get_request_method() != "POST")
            $this->response('', 406);

        if (!empty($this->_request)) {
            try {
                $jsonArr = json_decode($this->_request, true);
                foreach ($jsonArr as $key => $val) {
                    if ($val == '') {
                        $res = array('status' => 'failed', 'msg' => 'Missing data');
                        $this->response($this->json($res), 400);
                    }
                }
                //stan sesji
                $ses = $this->database->session($jsonArr);
                if ($ses) {
                    $res = array('status' => 'ok');
                    $this->response($this->json($res), 200);
                } else {
                    $res = array('status' => 'Session is invalid');
                    $this->response($this->json($res), 200);
                }
            } catch (Exception $e) {
                $err = array('status' => "failed", "msg" => "Exception occured");
                $this->response('', 400);
            }
        } else {
            $err = array('status' => "failed", "msg" => "Sent data is invalid");
            $this->response($this->json($err), 400);
        }
    }
}

$api = new API;
$api->processApi();
