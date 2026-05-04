import React from 'react';
import { useParams } from 'react-router-dom';

export function LegalPage() {
  const { pageId } = useParams<{ pageId: string }>();

  const content = {
    terms: {
      title: 'Terms of Service',
      body: (
        <>
          <p className="mb-4">Welcome to AnimXer. By accessing this website, we assume you accept these terms and conditions.</p>
          <h2 className="text-xl font-bold mt-6 mb-4">1. Copyright</h2>
          <p className="mb-4">AnimXer does not host any files on its servers. All contents are provided by non-affiliated third parties.</p>
          <h2 className="text-xl font-bold mt-6 mb-4">2. User conduct</h2>
          <p className="mb-4">Users must not use the website in any way that causes, or may cause, damage to the website or impairment of the availability or accessibility of the website.</p>
        </>
      ),
    },
    privacy: {
      title: 'Privacy Policy',
      body: (
        <>
          <p className="mb-4">Your privacy is important to us. It is AnimXer's policy to respect your privacy regarding any information we may collect from you across our website.</p>
          <h2 className="text-xl font-bold mt-6 mb-4">1. Information we collect</h2>
          <p className="mb-4">We only ask for personal information when we truly need it to provide a service to you. We collect it by fair and lawful means, with your knowledge and consent.</p>
          <h2 className="text-xl font-bold mt-6 mb-4">2. How we use your information</h2>
          <p className="mb-4">We may use the information we collect from you when you register, make a purchase, sign up for our newsletter, respond to a survey or marketing communication, surf the website, or use certain other site features.</p>
        </>
      ),
    },
    dmca: {
      title: 'DMCA Notice',
      body: (
        <>
          <p className="mb-4">AnimXer respects the intellectual property of others. If you believe that your copyrighted work has been copied in a way that constitutes copyright infringement and is accessible on this site, you may notify our copyright agent, as set forth in the Digital Millennium Copyright Act of 1998 (DMCA).</p>
          <p className="mb-4">Please note that AnimXer does not store any files on our servers. All video contents are hosted on non-affiliated third party providers.</p>
          <p className="mb-4">Contact us at <strong>animxerxyz@gmail.com</strong> for any DMCA takedown requests.</p>
        </>
      ),
    },
    contact: {
      title: 'Contact Us',
      body: (
        <>
          <p className="mb-4">If you have any questions, suggestions, or feedback, please feel free to contact us.</p>
          <p className="mb-4">Email: <strong>animxerxyz@gmail.com</strong></p>
          <p className="mb-4">We aim to respond to all inquiries within 24-48 hours.</p>
        </>
      ),
    }
  };

  const page = content[(pageId || 'terms') as keyof typeof content] || content.terms;

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      <h1 className="text-3xl sm:text-4xl font-black text-white mb-8 border-b border-[#1a1a1a] pb-6">
        {page.title}
      </h1>
      <div className="text-gray-300 leading-relaxed text-lg prose prose-invert max-w-none">
        {page.body}
      </div>
    </div>
  );
}
