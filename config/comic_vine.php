<?php

return [
    'api_key'  => env('COMIC_VINE_API_KEY'),
    'base_url' => 'https://comicvine.gamespot.com/api',
    'timeout'  => 10,
    'cache_ttl' => [
        'search'  => 300,   // 5 minutes
        'detail'  => 1800,  // 30 minutes
        'issue'   => 3600,  // 60 minutes
    ],
];
