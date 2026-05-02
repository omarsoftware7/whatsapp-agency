export default function Docs() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">L</span>
            </div>
            <span className="font-semibold text-gray-900 text-lg">Launcho Docs</span>
          </div>
          <a href="/login" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">Go to App →</a>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Hero */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Launcho Documentation</h1>
          <p className="text-xl text-gray-500">Everything you need to set up, connect, and run AI-powered social media campaigns through WhatsApp.</p>
        </div>

        {/* TOC */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-12">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Contents</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              ['#how-it-works', '1. How the Platform Works'],
              ['#dashboard', '2. Web Dashboard Guide'],
              ['#whatsapp-agent', '3. WhatsApp Agent (Client Flow)'],
              ['#connect-meta', '4. Connecting Facebook & Instagram'],
              ['#webhook', '5. Setting Up WhatsApp Webhook'],
              ['#admin', '6. Admin Panel'],
              ['#plans', '7. Plans & Credits'],
              ['#troubleshooting', '8. Troubleshooting'],
            ].map(([href, label]) => (
              <a key={href} href={href} className="text-indigo-600 hover:text-indigo-800 text-sm py-1">
                {label}
              </a>
            ))}
          </div>
        </div>

        <div className="space-y-16 prose-headings:scroll-mt-8">

          {/* Section 1 */}
          <section id="how-it-works">
            <SectionTitle number="1" title="How the Platform Works" />
            <p className="text-gray-600 mb-6">Launcho has two sides:</p>
            <Table
              headers={['Side', 'Who uses it', 'What it does']}
              rows={[
                ['Web Dashboard', 'Agency owner (you)', 'Create brands, manage clients, view published posts, track jobs'],
                ['WhatsApp Agent', 'Your clients', 'Send a product → get a designed post → approve it → goes live'],
              ]}
            />
            <p className="text-gray-600 mt-6 mb-4 font-medium">Full campaign flow:</p>
            <div className="bg-gray-900 rounded-xl overflow-hidden">
              <div className="px-4 py-2 bg-gray-800 text-xs text-gray-400 font-mono">WhatsApp → AI → Published Post</div>
              <div className="p-6 font-mono text-sm text-green-400 space-y-1">
                {[
                  '1. Client sends WhatsApp message + product photo',
                  '2. AI classifies intent → creates CreativeJob',
                  '3. Gemini generates 3 branded image variations',
                  '4. Client picks design (or asks for edits)',
                  '5. Gemini writes headline, body copy, CTA',
                  '6. Client approves copy',
                  '7. Instagram preview sent for final confirmation',
                  '8. Client confirms → post goes live',
                  '9. Published to Facebook Page + Instagram simultaneously',
                  '10. Client receives: "✅ Your post is live!"',
                ].map((line, i) => (
                  <div key={i} className="text-gray-300">{line}</div>
                ))}
              </div>
            </div>
          </section>

          {/* Section 2 */}
          <section id="dashboard">
            <SectionTitle number="2" title="Web Dashboard Guide" />

            <SubTitle>Registration & Login</SubTitle>
            <ol className="list-decimal list-inside text-gray-600 space-y-1 mb-6">
              <li>Go to <a href="https://omar-software.com" className="text-indigo-600">omar-software.com</a> and click Register</li>
              <li>Create your agency account</li>
              <li>Complete the Onboarding flow to set up your agency profile</li>
            </ol>

            <SubTitle>Job Stage Badges</SubTitle>
            <p className="text-gray-600 mb-3">Each job card on the dashboard shows its current stage:</p>
            <div className="space-y-2">
              {[
                ['await_user_input', 'gray', 'Waiting for client to send details'],
                ['generate_design', 'blue', 'AI is creating the image'],
                ['await_design_approval', 'yellow', 'Client reviewing design'],
                ['generate_ad_copy', 'blue', 'AI writing the copy'],
                ['await_copy_approval', 'yellow', 'Client reviewing copy'],
                ['await_publish_approval', 'orange', 'Client confirming final post'],
                ['publishing', 'purple', 'Posting to Meta'],
                ['completed', 'green', 'Live on Facebook & Instagram'],
              ].map(([stage, color, desc]) => (
                <div key={stage} className="flex items-center gap-3">
                  <span className={`text-xs font-mono px-2 py-1 rounded font-medium whitespace-nowrap
                    ${color === 'gray' ? 'bg-gray-100 text-gray-700' : ''}
                    ${color === 'blue' ? 'bg-blue-100 text-blue-700' : ''}
                    ${color === 'yellow' ? 'bg-yellow-100 text-yellow-700' : ''}
                    ${color === 'orange' ? 'bg-orange-100 text-orange-700' : ''}
                    ${color === 'purple' ? 'bg-purple-100 text-purple-700' : ''}
                    ${color === 'green' ? 'bg-green-100 text-green-700' : ''}
                  `}>{stage}</span>
                  <span className="text-gray-500 text-sm">{desc}</span>
                </div>
              ))}
            </div>

            <SubTitle>Other Pages</SubTitle>
            <Table
              headers={['Page', 'What it does']}
              rows={[
                ['Brand Library', 'Upload and manage logos, color palettes, product photos'],
                ['Content Plan', 'Plan upcoming campaigns with dates and topics'],
                ['Brand Posts', 'View all published posts with Facebook/Instagram IDs'],
                ['Leads', 'Collect and manage leads from campaigns'],
                ['Landing Pages', 'Build simple landing pages for campaigns'],
                ['Business Card', 'Generate digital business cards for clients'],
              ]}
            />
          </section>

          {/* Section 3 */}
          <section id="whatsapp-agent">
            <SectionTitle number="3" title="WhatsApp Agent — Client Flow" />

            <SubTitle>First Message (Onboarding)</SubTitle>
            <p className="text-gray-600 mb-3">When a client messages for the first time, the agent asks for their brand details:</p>
            <ChatExample messages={[
              { from: 'agent', text: 'Welcome to Launcho! 🎉\nTo create your first campaign, I need a few details:\n1. What is your business name?\n2. What is your main brand color? (e.g. #FF5733 or "blue")\n3. Send me your logo (optional)' },
              { from: 'client', text: 'Coffee Bloom, our color is dark green #1B4332' },
              { from: 'agent', text: 'Perfect! Your brand profile is saved. Send me a product and a short description to create your first campaign.' },
            ]} />

            <SubTitle>Creating a Campaign</SubTitle>
            <ChatExample messages={[
              { from: 'client', text: 'I want to promote my summer sale, 30% off all shoes [📎 photo attached]' },
              { from: 'agent', text: 'Generating 3 design options for you... 🎨\n[sends 3 image variations]\nWhich design do you like? Reply 1, 2, or 3.\nOr reply "redo" to generate new options.' },
              { from: 'client', text: '2' },
              { from: 'agent', text: 'Here\'s the ad copy:\n📢 Headline: Step Into Summer — 30% Off All Shoes!\n📝 Body: This weekend only, treat yourself to the shoes you\'ve been eyeing.\n🔗 CTA: Shop Now\n\nReply ✅ to approve or send your edits.' },
              { from: 'client', text: '✅' },
              { from: 'agent', text: '[sends Instagram preview]\nYour post is ready! Reply ✅ to publish now.' },
              { from: 'client', text: '✅' },
              { from: 'agent', text: '✅ Published! Your post is live on Facebook and Instagram.' },
            ]} />

            <SubTitle>Supported Commands</SubTitle>
            <Table
              headers={['Reply', 'Action']}
              rows={[
                ['1 / 2 / 3', 'Select a design variation'],
                ['✅', 'Approve current step'],
                ['redo', 'Regenerate designs'],
                ['Any text', 'Treated as an edit request (e.g. "make the text bigger")'],
                ['menu', 'See available actions'],
              ]}
            />
          </section>

          {/* Section 4 */}
          <section id="connect-meta">
            <SectionTitle number="4" title="Connecting Facebook & Instagram" />
            <p className="text-gray-600 mb-6">Each client connects their Facebook Page and Instagram Business Account once via OAuth.</p>

            <SubTitle>Required Permissions</SubTitle>
            <ul className="list-disc list-inside text-gray-600 space-y-1 mb-6">
              <li><code className="bg-gray-100 px-1 rounded text-sm">pages_manage_posts</code></li>
              <li><code className="bg-gray-100 px-1 rounded text-sm">pages_read_engagement</code></li>
              <li><code className="bg-gray-100 px-1 rounded text-sm">instagram_basic</code></li>
              <li><code className="bg-gray-100 px-1 rounded text-sm">instagram_content_publish</code></li>
            </ul>

            <SubTitle>Client OAuth Flow</SubTitle>
            <ol className="list-decimal list-inside text-gray-600 space-y-2">
              <li>Client visits: <code className="bg-gray-100 px-1 rounded text-sm">https://api.omar-software.com/api/meta/oauth/start?client_id=PHONE</code></li>
              <li>They log in with Facebook and grant the required permissions</li>
              <li>Tokens are stored in the database against their record</li>
              <li>All future posts use their Page token automatically</li>
            </ol>
            <p className="text-gray-500 text-sm mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
              The WhatsApp agent sends the OAuth link automatically if a client tries to publish without a connected account.
            </p>
          </section>

          {/* Section 5 */}
          <section id="webhook">
            <SectionTitle number="5" title="Setting Up WhatsApp Webhook" />

            <SubTitle>In Meta Developer Portal</SubTitle>
            <ol className="list-decimal list-inside text-gray-600 space-y-2 mb-6">
              <li>Go to your app → WhatsApp → Configuration</li>
              <li>Set Webhook URL to: <code className="bg-gray-100 px-1 rounded text-sm">https://api.omar-software.com/api/webhooks/whatsapp</code></li>
              <li>Set Verify Token to your <code className="bg-gray-100 px-1 rounded text-sm">META_VERIFY_TOKEN</code> env var value</li>
              <li>Subscribe to the <code className="bg-gray-100 px-1 rounded text-sm">messages</code> webhook field</li>
            </ol>

            <SubTitle>Test the Webhook</SubTitle>
            <CodeBlock>{`curl "https://api.omar-software.com/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=test123"
# Should return: test123`}</CodeBlock>
          </section>

          {/* Section 6 */}
          <section id="admin">
            <SectionTitle number="6" title="Admin Panel" />
            <p className="text-gray-600 mb-4">Access at <code className="bg-gray-100 px-1 rounded text-sm">/admin</code> (requires admin role).</p>
            <Table
              headers={['Page', 'What it shows']}
              rows={[
                ['Metrics', 'Total users, brands, jobs, published posts, revenue'],
                ['Users', 'All registered users, subscription plans, job history'],
                ['Brands', 'All brands across all users, edit settings'],
                ['Jobs', 'All jobs with full details, error logs, manual stage control'],
              ]}
            />
          </section>

          {/* Section 7 */}
          <section id="plans">
            <SectionTitle number="7" title="Plans & Credits" />
            <Table
              headers={['Plan', 'Monthly Credits', 'Price']}
              rows={[
                ['Trial', '5', 'Free'],
                ['Starter', '20', '—'],
                ['Growth', '100', '—'],
                ['Pro', '250', '—'],
                ['Agency', '500', '—'],
              ]}
            />
            <ul className="list-disc list-inside text-gray-600 space-y-1 mt-4">
              <li>Each campaign job costs 1 credit</li>
              <li>Credits reset monthly on subscription renewal date</li>
              <li>Payment via PayPal (monthly or yearly — yearly saves 20%)</li>
            </ul>
          </section>

          {/* Section 8 */}
          <section id="troubleshooting">
            <SectionTitle number="8" title="Troubleshooting" />
            <div className="space-y-6">
              {[
                {
                  q: 'WhatsApp messages not received',
                  steps: [
                    'Check that the webhook is subscribed to "messages" in Meta Developer Portal',
                    'Confirm META_VERIFY_TOKEN matches between your .env and Meta portal',
                    'Ensure the backend URL is publicly accessible',
                  ],
                },
                {
                  q: 'Instagram publishing fails',
                  steps: [
                    'The Instagram account must be a Business or Creator account (not personal)',
                    'The Facebook Page must be connected to the Instagram account in Facebook settings',
                    'Ensure the client completed the Meta OAuth flow with Instagram permissions',
                  ],
                },
                {
                  q: 'Facebook OAuth shows "Feature Unavailable"',
                  steps: [
                    'Set a Privacy Policy URL in Meta App Settings → Basic',
                    'Add META_CONFIG_ID env var if using Facebook Login for Business',
                    'If business is not verified, add testers in App Roles → Roles → Add People',
                  ],
                },
                {
                  q: 'Job stuck at generate_design',
                  steps: [
                    'Check Gemini API key is valid and has quota remaining',
                    'Look for "DesignService error" in Railway logs',
                    'Set MOCK_AI=true temporarily to test the pipeline without real AI calls',
                  ],
                },
              ].map(({ q, steps }) => (
                <div key={q} className="bg-white rounded-xl border border-gray-200 p-5">
                  <p className="font-semibold text-gray-900 mb-3">{q}</p>
                  <ul className="space-y-1">
                    {steps.map((s, i) => (
                      <li key={i} className="flex gap-2 text-gray-600 text-sm">
                        <span className="text-gray-400 mt-0.5">→</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-gray-200 text-center text-gray-400 text-sm">
          Launcho — Generative AI Developer Growth Lab, Place-IL
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ number, title }: { number: string; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
        <span className="text-white font-bold text-sm">{number}</span>
      </div>
      <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
    </div>
  );
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">{children}</h3>;
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            {headers.map(h => (
              <th key={h} className="text-left px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} className={`px-4 py-3 text-gray-600 ${j === 0 ? 'font-medium text-gray-800' : ''}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <div className="bg-gray-900 rounded-xl overflow-hidden">
      <pre className="p-5 text-sm text-gray-300 font-mono overflow-x-auto whitespace-pre-wrap">{children}</pre>
    </div>
  );
}

function ChatExample({ messages }: { messages: { from: 'client' | 'agent'; text: string }[] }) {
  return (
    <div className="bg-[#0b141a] rounded-xl p-4 space-y-3">
      {messages.map((msg, i) => (
        <div key={i} className={`flex ${msg.from === 'client' ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl text-sm whitespace-pre-line ${
            msg.from === 'client'
              ? 'bg-[#005c4b] text-white rounded-br-sm'
              : 'bg-[#202c33] text-gray-200 rounded-bl-sm'
          }`}>
            {msg.text}
          </div>
        </div>
      ))}
    </div>
  );
}
