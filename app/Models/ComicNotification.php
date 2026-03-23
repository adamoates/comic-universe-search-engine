<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ComicNotification extends Model
{
    /** @use HasFactory<\Database\Factories\ComicNotificationFactory> */
    use HasFactory;

    protected $table = 'comic_notifications';

    protected $fillable = [
        'user_id',
        'type',
        'title',
        'message',
        'resource_type',
        'comic_vine_id',
        'release_date',
        'image',
        'read',
    ];

    protected function casts(): array
    {
        return [
            'release_date' => 'date',
            'image'        => 'array',
            'read'         => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
