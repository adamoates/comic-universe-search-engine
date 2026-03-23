<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\TrackedItem>
 */
class TrackedItemFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id'               => \App\Models\User::factory(),
            'comic_vine_id'         => (string) $this->faker->numberBetween(1000, 99999),
            'resource_type'         => $this->faker->randomElement(['volume', 'character', 'story_arc']),
            'name'                  => $this->faker->words(3, true),
            'image'                 => null,
            'publisher'             => $this->faker->company(),
            'last_checked'          => null,
            'latest_known_issue_id' => null,
        ];
    }
}
