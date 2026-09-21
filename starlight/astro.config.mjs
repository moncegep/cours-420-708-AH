// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
	integrations: [
		starlight({
			title: 'Microservices',
			defaultLocale: "root",
			locales: {
				root: {
					label: 'Français',
					lang: 'fr',
				}
			},
			customCss: [
				'./src/styles/custom.css',
				'./src/styles/global.css',
			],
			sidebar: [
				{
					label: 'Notes de cours',
					items: [
						{ label: "Intro à Node.js et npm", slug: "cours/01-nodejs" },
						{ label: "JavaScript moderne", slug: "cours/02-javascript" },
						{ label: "Conception d'une API", slug: "cours/03-conception-api" },
						{ label: "Prise en main d'Express", slug: "cours/03-express-1" },
						{ label: "Middleware d'Express", slug: "cours/04-express-2" },
					],
				},
				{
					label: 'Exercices',
					items: [
						{ label: "Prise en main d'Express", slug: "exercices/01-express" }
					],
				},
				// {
				// 	label: 'Reference',
				// 	items: [{ autogenerate: { directory: 'reference' } }],
				// },
			],
		}),
		react(),
	],
});
