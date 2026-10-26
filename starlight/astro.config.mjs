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
						{ label: "Structurer une API Express", slug: "cours/05-express-3" },
						{ label: "Tester une API Express", slug: "cours/06-express-4" },
						{ label: "Base de données", slug: "cours/07-bd" },
						// { label: "Authentification", slug: "cours/08-authentification" },
					],
				},
				{
					label: 'Exercices',
					items: [
						{ label: "Prise en main d'Express", slug: "exercices/01-express" },
						{ label: "Conception d'API", slug: "exercices/02-probleme" },
						{ label: "Tests unitaires", slug: "exercices/03-tests" },
					],
				},
				{
					label: 'TPs',
					items: [
						{ label: "TP1 - Ogodo", slug: "tps/01-api" },
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
