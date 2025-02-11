<?php

/*
|--------------------------------------------------------------------------
| Application Routes
|--------------------------------------------------------------------------
|
| Here is where you can register all of the routes for an application.
| It's a breeze. Simply tell Laravel the URIs it should respond to
| and give it the controller to call when that URI is requested.
|
*/

$app->group(
    ['namespace' => 'App\Http\Controllers'],
    function () use ($app) {
        $app->get('/', 'IndexController@getIndex');
        $app->post('/invite', 'IndexController@postInvite');
        $app->get('/badge.svg', 'BadgeController@generate');
    }
);
