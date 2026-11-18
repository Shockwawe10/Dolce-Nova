// The site's legal pages (the owner, 2026-11-18: "like your regular e-commerce shop, like privacy policy, all kind of
// policies, all rights reserved"). Written to describe what this site really does, checked against the code:
// no cookies (the live response sets none), the cart in localStorage 'dn-cart', the last order in sessionStorage
// 'dn-last-order', nothing sent anywhere. tools/pages.mjs turns each entry into <file>.
// Each section: [heading, [paragraph or ['list', item...], ...]]. Text is plain; links are written as {text, href}.

export const UPDATED = '18 November 2026';

const GITHUB_PRIVACY = { text: 'GitHub General Privacy Statement', href: 'https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement' };

export const LEGAL = [
  {
    file: 'privacy.html', slug: 'privacy', title: 'Privacy policy', label: 'Privacy policy',
    lede: 'We keep this short because there is little to say: this site does not collect personal data, track you or send what you type anywhere.',
    sections: [
      ['Who we are', ['Dolce Nova (“we”, “us”) runs this website. This policy explains what happens to information when you use it.']],
      ['What this site keeps, and where', [
        'Everything below stays in your own browser, on your own device. None of it reaches us or anyone else.',
        ['list',
          'Your cart. The coffees in your cart are kept in your browser’s local storage, so they are still there when you come back. Empty the cart, or clear this site’s data in your browser, to remove them.',
          'Your order details. When you place an order, your name, email, delivery address and the order lines are kept in this browser tab’s session storage, so the confirmation page can show them. They are deleted when you close the tab.',
          'Card details. They are checked in your browser for format only (the number, expiry and security code). They are never stored and never sent.'],
      ]],
      ['What we do not do', [
        ['list', 'No cookies.', 'No analytics, advertising or tracking pixels.', 'No third-party scripts: the fonts, images and code are all served from this site.', 'No emails: we do not send any.'],
      ]],
      ['Hosting', [
        ['This site is hosted on GitHub Pages. To deliver the pages and keep them secure, GitHub’s servers process your IP address and the details of each request, as described in the ', GITHUB_PRIVACY, '. We do not receive these logs.'],
      ]],
      ['Links to other sites', ['The links to Facebook, Instagram and X take you to those sites, and their own privacy policies apply there.']],
      ['Your rights', [
        'Because we hold no personal data about you, there is nothing for us to access, correct or delete: the data described above sits in your browser, and you can remove it at any time.',
        'Under the EU General Data Protection Regulation you may also complain to the data protection authority in your country.',
      ]],
      ['Changes', ['If this policy changes, we will update this page and the date at the top.']],
    ],
  },
  {
    file: 'terms.html', slug: 'terms', title: 'Terms of use', label: 'Terms of use',
    lede: 'These terms apply when you use this website.',
    sections: [
      ['Orders', [
        'This website shows our coffees and lets you go through a checkout, but it does not take payment and does not ship orders. Placing an order here does not form a contract of sale, and no money is taken.',
      ]],
      ['Prices', [['Prices are shown in euro and include VAT. Shipping is added at checkout as described on our ', { text: 'shipping and returns', href: 'shipping.html' }, ' page.']]],
      ['Content and ownership', [
        '© 2026 Dolce Nova. The text, the design of this site and the bag artwork are ours, and all rights are reserved.',
        ['Photographs are by their photographers and are used under the licences listed on the ', { text: 'photograph credits', href: 'credits.html' }, ' page. The fonts are used under the SIL Open Font License and the 3D library, three.js, under the MIT licence.'],
      ]],
      ['Using the site', ['Please do not try to disrupt the site, break its security, or copy it in bulk by automated means.']],
      ['Links to other sites', ['We are not responsible for the content of the sites we link to, such as Facebook, Instagram and X.']],
      ['Liability', ['The site is provided as it is. To the extent the law allows, we are not liable for losses from using it. Nothing in these terms limits rights you have by law.']],
      ['Changes', ['We may update these terms; the date at the top shows the latest version.']],
    ],
  },
  {
    file: 'shipping.html', slug: 'shipping', title: 'Shipping and returns', label: 'Shipping and returns',
    lede: 'We roast on the next working day and ship across the European Union.',
    sections: [
      ['Where we ship', ['To all 27 countries of the European Union.']],
      ['Delivery', [
        ['list',
          'Standard: 3 to 5 working days, €4.90, free on orders from €40.',
          'Express: 1 to 2 working days, €9.90.'],
        'Working days are Monday to Friday; public holidays may add a day. Your order confirmation shows the dates your parcel should arrive.',
      ]],
      ['Returns', [
        'You can return unopened bags within 14 days of delivery for a full refund of their price. Tell us within those 14 days by replying to your order confirmation, then send the bags back within the next 14 days. Return postage is yours unless the coffee was faulty or not what you ordered.',
        'For reasons of freshness and hygiene, opened bags cannot be returned, unless the coffee is faulty.',
      ]],
      ['Something wrong?', ['If a bag arrives damaged, or is not what you ordered, reply to your order confirmation within 14 days and we will replace it or refund it, including the shipping.']],
    ],
  },
  {
    file: 'cookies.html', slug: 'cookies', title: 'Cookies', label: 'Cookies',
    lede: 'This site uses no cookies, so there is no cookie banner: there is nothing to agree to.',
    sections: [
      ['What we use instead', [
        'Two things are kept in your browser so the shop works. Neither is a cookie, neither is read by us, and both are needed only for features you use.',
        ['list',
          'Your cart, in local storage (dn-cart), so it is there when you come back.',
          'Your last order, in session storage (dn-last-order), so the confirmation page can show it. It is deleted when you close the tab.'],
      ]],
      ['Third parties', ['There are none on this site. Our host, GitHub Pages, sets no cookies on it.']],
      ['More', [['Our ', { text: 'privacy policy', href: 'privacy.html' }, ' explains what this site keeps and where.']]],
    ],
  },
];

/** The footer's links to other sites: the platforms themselves (there are no Dolce Nova accounts). */
export const SOCIAL = [
  { name: 'Facebook', href: 'https://www.facebook.com/' },
  { name: 'Instagram', href: 'https://www.instagram.com/' },
  { name: 'X', href: 'https://x.com/' },
];
