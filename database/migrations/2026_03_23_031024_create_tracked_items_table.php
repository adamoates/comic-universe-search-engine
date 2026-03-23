<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('tracked_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('comic_vine_id');
            $table->enum('resource_type', ['volume', 'character', 'story_arc']);
            $table->string('name');
            $table->string('image')->nullable();
            $table->string('publisher')->nullable();
            $table->timestamp('last_checked')->nullable();
            $table->string('latest_known_issue_id')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'comic_vine_id', 'resource_type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tracked_items');
    }
};
