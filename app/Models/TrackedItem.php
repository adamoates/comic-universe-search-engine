<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TrackedItem extends Model
{
    /** @use HasFactory<\Database\Factories\TrackedItemFactory> */
    use HasFactory;

    protected $fillable = [
        'user_id',
        'comic_vine_id',
        'resource_type',
        'name',
        'image',
        'publisher',
        'last_checked',
        'latest_known_issue_id',
    ];

    protected function casts(): array
    {
        return [
            'last_checked' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
