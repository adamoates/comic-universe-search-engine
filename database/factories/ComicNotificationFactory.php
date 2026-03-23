<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\ComicNotification>
 */
class ComicNotificationFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id'       => \App\Models\User::factory(),
            'type'          => $this->faker->randomElement(['released_today', 'upcoming']),
            'title'         => $this->faker->words(5, true),
            'message'       => $this->faker->sentence(),
            'resource_type' => 'issue',
            'comic_vine_id' => (string) $this->faker->numberBetween(1000, 99999),
            'release_date'  => $this->faker->dateTimeBetween('-1 month', '+3 months')->format('Y-m-d'),
            'image'         => null,
            'read'          => false,
        ];
    }
}
