import { metadataFor, SITE_ORIGIN } from '../src/data/pageMetadata.js';

export function seoPlugin() {
  return {
    name: 'portfolio-search-metadata',
    transformIndexHtml(html, context) {
      const data = metadataFor(context.path);
      if (!data) return html;
      const person = { '@type': 'Person', '@id': `${SITE_ORIGIN}/#person`, name: 'Vladimir Leicht',
        url: `${SITE_ORIGIN}/`, jobTitle: 'Information Technology Specialist - Systems Integration',
        knowsAbout: ['Systems integration', 'Windows Server', 'Virtualization', 'Unified Endpoint Management', 'Web development'] };
      const schema = { '@context': 'https://schema.org', '@type': data.type,
        '@id': `${data.url}#webpage`, url: data.url, name: data.title, description: data.description,
        inLanguage: ['en', 'de'], ...(data.type === 'ProfilePage' ? { mainEntity: person } : { author: person }),
      };
      return { html: html.replace(/<title>[\s\S]*?<\/title>/i, '')
        .replace(/<meta\s+name=["']description["'][^>]*>/i, ''), tags: [
        { tag: 'title', children: data.title },
        { tag: 'meta', attrs: { name: 'description', content: data.description } },
        { tag: 'link', attrs: { rel: 'canonical', href: data.url } },
        { tag: 'meta', attrs: { name: 'robots', content: 'index, follow, max-image-preview:large' } },
        ...Object.entries({ type: 'website', title: data.title, description: data.description,
          url: data.url, image: data.image, locale: 'en_US', site_name: 'Vladimir Leicht' }).map(([key, content]) =>
          ({ tag: 'meta', attrs: { property: `og:${key}`, content } })),
        ...Object.entries({ card: 'summary_large_image', title: data.title, description: data.description,
          image: data.image }).map(([key, content]) => ({ tag: 'meta', attrs: { name: `twitter:${key}`, content } })),
        { tag: 'script', attrs: { type: 'application/ld+json' }, children: JSON.stringify(schema).replace(/</g, '\\u003c') },
      ] };
    },
  };
}
