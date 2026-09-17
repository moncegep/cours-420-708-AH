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
						{ label: "Intro à Node.js et npm", slug: "guides/01-nodejs" },
						{ label: "JavaScript moderne", slug: "guides/02-javascript" },
						{ label: "Prise en main d'Express", slug: "guides/03-express" },
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
