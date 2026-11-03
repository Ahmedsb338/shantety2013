import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Mail, Sparkles, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface NewsletterSignupProps {
  variant?: 'footer' | 'card' | 'inline';
  className?: string;
}

export const NewsletterSignup: React.FC<NewsletterSignupProps> = ({
  variant = 'footer',
  className = '',
}) => {
  const { language, showToast } = useStore();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'duplicate'>('idle');
  const [feedbackMessage, setFeedbackMessage] = useState<string>('');

  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setStatus('error');
      setFeedbackMessage(
        language === 'ar'
          ? 'يرجى إدخال عنوان البريد الإلكتروني.'
          : 'Please enter an email address.'
      );
      return;
    }

    if (!emailRegex.test(cleanEmail)) {
      setStatus('error');
      setFeedbackMessage(
        language === 'ar'
          ? 'صيغة البريد الإلكتروني غير صحيحة. مثال: name@example.com'
          : 'Please enter a valid email address (e.g. name@example.com).'
      );
      return;
    }

    setStatus('loading');
    setFeedbackMessage('');

    try {
      let savedSuccessfully = false;
      let alreadySubscribed = false;

      // 1. Direct Supabase Client Attempt (if configured in browser)
      if (isSupabaseConfigured) {
        try {
          const { error } = await supabase
            .from('newsletter_subscribers')
            .insert([
              {
                email: cleanEmail,
                status: 'active',
                source: 'storefront_footer',
                created_at: new Date().toISOString(),
              },
            ]);

          if (!error) {
            savedSuccessfully = true;
          } else {
            // Check for unique constraint violation (duplicate email)
            if (
              error.code === '23505' ||
              error.message?.includes('duplicate') ||
              error.message?.includes('unique')
            ) {
              alreadySubscribed = true;
            } else {
              console.warn('Supabase direct insert notice:', error.message);
            }
          }
        } catch (supabaseErr) {
          console.warn('Supabase client error, switching to backend endpoint:', supabaseErr);
        }
      }

      // 2. Fallback to Server Authoritative Endpoint if not completed directly
      if (!savedSuccessfully && !alreadySubscribed) {
        const response = await fetch('/api/newsletter/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, source: 'storefront_footer' }),
        });

        const data = await response.json().catch(() => ({}));

        if (response.ok && data.success) {
          if (data.isNew === false) {
            alreadySubscribed = true;
          } else {
            savedSuccessfully = true;
          }
        } else if (response.status === 400 && data.error?.includes('unique')) {
          alreadySubscribed = true;
        } else {
          throw new Error(data.error || 'Subscription failed');
        }
      }

      if (alreadySubscribed) {
        setStatus('duplicate');
        const msg =
          language === 'ar'
            ? 'أنتِ مسجلة بالفعل في نشرة شنطتي البريدية! يسعدنا تواصلكِ معنا.'
            : 'You are already subscribed to the Shantety newsletter! Thank you.';
        setFeedbackMessage(msg);
        showToast(msg, 'info');
      } else {
        setStatus('success');
        setEmail('');
        const msg =
          language === 'ar'
            ? 'تم اشتراككِ بنجاح! كوني مستعدة لاستقبال أرقى التشكيلات والعروض الحصرية.'
            : 'Successfully subscribed! Get ready for exclusive drops and VIP private sales.';
        setFeedbackMessage(msg);
        showToast(msg, 'success');
      }
    } catch (err: any) {
      console.error('Newsletter subscription error:', err);
      setStatus('error');
      const errText =
        language === 'ar'
          ? 'حدث خطأ مؤقت أثناء التسجيل. يرجى المحاولة مرة أخرى لاحقاً.'
          : 'A temporary error occurred. Please try again in a moment.';
      setFeedbackMessage(errText);
      showToast(errText, 'error');
    }
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-stone-900 via-stone-900 to-[#1e1717] border border-stone-800 p-6 sm:p-8 text-white ${className}`}
      dir={language === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* Subtle decorative glow */}
      <div className="absolute top-0 end-0 -mt-8 -me-8 w-48 h-48 bg-[#E10600]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 start-0 -mb-8 -ms-8 w-40 h-40 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 max-w-xl mx-auto space-y-4">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-800/80 border border-stone-700/60 text-[#E10600] text-xs font-bold tracking-wide">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span>
              {language === 'ar' ? 'نادي أصدقاء شنطتي الحصري' : 'VIP Shantety Circle'}
            </span>
          </div>

          <h3 className="text-lg sm:text-xl md:text-2xl font-black text-white tracking-tight">
            {language === 'ar'
              ? 'اشتركي في نشرتنا البريدية لتصلكِ أحدث التشكيلات'
              : 'Subscribe to Our Newsletter for Exclusive Drops'}
          </h3>

          <p className="text-xs sm:text-sm text-stone-400 leading-relaxed max-w-lg mx-auto">
            {language === 'ar'
              ? 'احصلي فوراً على إشعارات بكوبونات الخصم السرية وتخفيضات نهاية الموسم قبل الجميع.'
              : 'Be the first to unlock secret VIP vouchers, seasonal sales, and handcrafted artisan previews.'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 start-0 flex items-center ps-3.5 pointer-events-none text-stone-500">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (status !== 'idle') setStatus('idle');
                }}
                disabled={status === 'loading'}
                placeholder={
                  language === 'ar'
                    ? 'أدخلي بريدكِ الإلكتروني (مثال: name@example.com)...'
                    : 'Enter your email address (e.g. name@example.com)...'
                }
                className="w-full ps-10 pe-4 py-3 bg-stone-950/90 border border-stone-700/80 rounded-xl text-xs sm:text-sm text-white placeholder-stone-500 focus:outline-none focus:border-[#E10600] focus:ring-1 focus:ring-[#E10600] transition-all disabled:opacity-50"
                required
                autoComplete="email"
                aria-label={language === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}
              />
            </div>

            <button
              type="submit"
              disabled={status === 'loading'}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#E10600] hover:bg-[#c50500] active:scale-98 text-white font-bold text-xs sm:text-sm shadow-lg shadow-red-950/40 transition-all disabled:opacity-50 shrink-0 cursor-pointer"
            >
              {status === 'loading' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{language === 'ar' ? 'جارٍ الاشتراك...' : 'Subscribing...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>{language === 'ar' ? 'اشتركي الآن' : 'Subscribe Now'}</span>
                </>
              )}
            </button>
          </div>

          {/* Feedback & Status Messages */}
          {feedbackMessage && (
            <div
              className={`flex items-center gap-2 text-xs p-3 rounded-xl border animate-fadeIn ${
                status === 'success'
                  ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                  : status === 'duplicate'
                  ? 'bg-amber-950/40 border-amber-800/60 text-amber-300'
                  : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
              }`}
            >
              {status === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />}
              {status === 'duplicate' && <Sparkles className="w-4 h-4 shrink-0 text-amber-400" />}
              {status === 'error' && <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />}
              <span className="leading-snug">{feedbackMessage}</span>
            </div>
          )}

          {/* Privacy Note */}
          <p className="text-[11px] text-stone-500 text-center">
            {language === 'ar'
              ? '🔒 نحن نحترم خصوصيتكِ تماماً. لا نرسل رسائل مزعجة، ويمكنكِ إلغاء الاشتراك في أي وقت.'
              : '🔒 We respect your privacy. No spam ever, unsubscribe whenever you wish.'}
          </p>
        </form>
      </div>
    </div>
  );
};
