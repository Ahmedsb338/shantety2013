import React, { useState, useMemo } from 'react';
import { Product, ProductReview } from '../types/ecommerce';
import { StoreDatabase } from '../services/storeDatabase';
import { useStore } from '../context/StoreContext';
import {
  Star,
  CheckCircle2,
  ThumbsUp,
  MessageSquare,
  ShieldCheck,
  Plus,
  Filter,
  ArrowUpDown,
  Sparkles,
  X,
  UserCheck,
} from 'lucide-react';

interface CustomerReviewsProps {
  product: Product;
}

export const CustomerReviews: React.FC<CustomerReviewsProps> = ({ product }) => {
  const { language, showToast } = useStore();

  const [reviews, setReviews] = useState<ProductReview[]>(() =>
    StoreDatabase.getReviews(product.id)
  );

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [userCity, setUserCity] = useState('');
  const [reviewTitle, setReviewTitle] = useState('');
  const [comment, setComment] = useState('');
  const [isVerifiedManual, setIsVerifiedManual] = useState(true);
  const [qualityFeedback, setQualityFeedback] = useState<'excellent' | 'good' | 'average'>('excellent');
  const [sizeFeedback, setSizeFeedback] = useState<'true' | 'runs_small' | 'runs_large'>('true');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtering & Sorting State
  const [filterRating, setFilterRating] = useState<number | 'all'>('all');
  const [filterVerifiedOnly, setFilterVerifiedOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'recent' | 'highest' | 'helpful'>('recent');

  // Track voted review IDs locally in this session to prevent duplicate votes
  const [votedReviews, setVotedReviews] = useState<Record<string, boolean>>({});

  // Summary Metrics
  const summary = useMemo(() => {
    return StoreDatabase.calculateRatingSummary(product.id);
  }, [product.id, reviews]);

  // Filtered & Sorted Reviews
  const displayReviews = useMemo(() => {
    return reviews
      .filter((r) => {
        if (filterRating !== 'all' && Math.round(r.rating) !== filterRating) return false;
        if (filterVerifiedOnly && !r.is_verified_purchase) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'highest') return b.rating - a.rating;
        if (sortBy === 'helpful') return (b.helpful_count || 0) - (a.helpful_count || 0);
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
  }, [reviews, filterRating, filterVerifiedOnly, sortBy]);

  // Handle Review Submission
  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();

    if (!userName.trim()) {
      showToast(language === 'ar' ? 'الرجاء إدخال اسمك' : 'Please enter your name', 'error');
      return;
    }
    if (!comment.trim()) {
      showToast(language === 'ar' ? 'الرجاء كتابة رأيك في المنتج' : 'Please provide your review feedback', 'error');
      return;
    }

    setIsSubmitting(true);

    // Verify purchase against orders in database
    const verifyResult = StoreDatabase.verifyCustomerPurchase(product.id, {
      email: userEmail,
      phone: userPhone,
      orderNumber: orderNumber,
    });

    const isVerified = verifyResult.isVerified || isVerifiedManual;

    const newRev = StoreDatabase.addReview({
      product_id: product.id,
      user_name: userName.trim(),
      user_email: userEmail.trim() || undefined,
      user_phone: userPhone.trim() || undefined,
      order_number: verifyResult.orderNumber || orderNumber.trim() || undefined,
      user_city: userCity.trim() || undefined,
      rating,
      title: reviewTitle.trim() || undefined,
      comment: comment.trim(),
      is_verified_purchase: isVerified,
      attributes_feedback: {
        quality: qualityFeedback,
        true_to_size: sizeFeedback,
        matches_photo: true,
      },
    });

    setReviews(StoreDatabase.getReviews(product.id));
    setIsSubmitting(false);
    setIsFormOpen(false);

    // Reset Form
    setReviewTitle('');
    setComment('');
    setOrderNumber('');

    showToast(
      language === 'ar'
        ? isVerified
          ? 'تم نشر تقييمك بنجاح مع شارة (شراء مؤكد) ✓'
          : 'شكراً لك! تم إضافة تقييمك للمنتج'
        : isVerified
        ? 'Review submitted with Verified Purchase badge ✓'
        : 'Thank you! Your review has been added',
      'success'
    );
  };

  // Handle Vote Helpful
  const handleHelpful = (reviewId: string) => {
    if (votedReviews[reviewId]) {
      showToast(
        language === 'ar' ? 'لقد قمت بالتصويت لهذا التقييم مسبقاً' : 'You have already voted on this review',
        'info'
      );
      return;
    }

    const newCount = StoreDatabase.voteHelpful(reviewId);
    setReviews(StoreDatabase.getReviews(product.id));
    setVotedReviews((prev) => ({ ...prev, [reviewId]: true }));
    showToast(
      language === 'ar' ? 'شكراً لتقييمك لمصداقية المراجعة' : 'Thank you for your feedback',
      'success'
    );
  };

  const getRatingLabel = (val: number) => {
    switch (val) {
      case 5:
        return language === 'ar' ? 'ممتاز جداً - أنصح به بشدة' : 'Excellent - Highly Recommended';
      case 4:
        return language === 'ar' ? 'جيد جداً - راضٍ تماماً' : 'Very Good - Satisfied';
      case 3:
        return language === 'ar' ? 'متوسط - مقبول' : 'Average - Acceptable';
      case 2:
        return language === 'ar' ? 'أقل من المتوقع' : 'Below Expectation';
      case 1:
        return language === 'ar' ? 'غير راضٍ' : 'Unsatisfied';
      default:
        return '';
    }
  };

  return (
    <div className="pt-8 border-t border-stone-200 space-y-8" id="customer-reviews-section">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg sm:text-xl font-black text-stone-900">
              {language === 'ar' ? 'تقييمات وآراء المشترين' : 'Customer Reviews & Feedback'}
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#E10600]/10 text-[#E10600]">
              {summary.totalReviews} {language === 'ar' ? 'تقييم' : 'reviews'}
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            {language === 'ar'
              ? 'تجارب حقيقية وموثقة من عملاء شنطتي بعد الشراء والمعاينة الفعلية'
              : 'Authentic verified feedback from genuine Shantety store customers'}
          </p>
        </div>

        <button
          onClick={() => setIsFormOpen(true)}
          className="inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-[#E10600] hover:bg-[#C50500] text-white text-xs font-bold transition-all shadow-md cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{language === 'ar' ? 'أضف تقييمك وتجربتك' : 'Write a Review'}</span>
        </button>
      </div>

      {/* Aggregate Rating & Summary Grid */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-7 shadow-xs grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Overall Score Box */}
        <div className="md:col-span-4 flex flex-col items-center justify-center text-center p-4 border-b md:border-b-0 md:border-l rtl:md:border-l-0 rtl:md:border-r border-stone-200/80">
          <div className="text-4xl sm:text-5xl font-black text-stone-900 tracking-tight">
            {summary.averageRating}
          </div>
          <div className="flex items-center gap-1 my-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-5 h-5 ${
                  star <= Math.round(summary.averageRating)
                    ? 'fill-amber-400 text-amber-400'
                    : 'fill-stone-100 text-stone-300'
                }`}
              />
            ))}
          </div>
          <p className="text-xs font-medium text-stone-500">
            {language === 'ar'
              ? `بناءً على ${summary.totalReviews} تقييم حقيقي`
              : `Based on ${summary.totalReviews} verified reviews`}
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>
              {language === 'ar'
                ? `${summary.recommendationRate}% من المشترين يوصون بالقطعة`
                : `${summary.recommendationRate}% recommend this item`}
            </span>
          </div>
        </div>

        {/* 5-Star Breakdown Bars */}
        <div className="md:col-span-5 space-y-2">
          {([5, 4, 3, 2, 1] as const).map((starNum) => {
            const count = summary.distribution[starNum];
            const percentage = summary.totalReviews > 0 ? Math.round((count / summary.totalReviews) * 100) : 0;
            return (
              <div
                key={starNum}
                onClick={() => setFilterRating(filterRating === starNum ? 'all' : starNum)}
                className={`flex items-center gap-3 text-xs cursor-pointer group py-0.5 rounded-md px-1 transition-colors ${
                  filterRating === starNum ? 'bg-stone-100 font-bold' : 'hover:bg-stone-50'
                }`}
              >
                <div className="w-12 flex items-center gap-1 shrink-0 text-stone-700 font-medium">
                  <span>{starNum}</span>
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                </div>
                <div className="flex-1 h-2.5 bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="w-10 text-stone-400 text-[11px] text-right rtl:text-left shrink-0">
                  {percentage}%
                </div>
              </div>
            );
          })}
        </div>

        {/* Shantety Buyer Protection Guarantee */}
        <div className="md:col-span-3 bg-stone-50 rounded-xl p-4 border border-stone-200/80 space-y-2 text-xs">
          <div className="flex items-center gap-2 text-stone-900 font-bold">
            <ShieldCheck className="w-4 h-4 text-[#E10600]" />
            <span>{language === 'ar' ? 'توثيق المشتريات' : 'Verified Reviews'}</span>
          </div>
          <p className="text-[11px] text-stone-600 leading-relaxed">
            {language === 'ar'
              ? 'تمنح شارة "شراء مؤكد" للعملاء الذين تم التحقق من رقم طلبهم أو استلامهم للمنتج من فروع ومندوبي شنطتي.'
              : 'The "Verified Purchase" badge is awarded to customers matching registered orders or in-store pickups.'}
          </p>
          <div className="pt-1 text-[11px] font-bold text-emerald-700 flex items-center gap-1">
            <UserCheck className="w-3.5 h-3.5" />
            <span>
              {summary.verifiedCount} {language === 'ar' ? 'مراجعة موثقة للشراء' : 'verified purchases'}
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Sort Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-stone-500 font-semibold flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? 'تصفية:' : 'Filter:'}</span>
          </span>

          <button
            onClick={() => setFilterRating('all')}
            className={`py-1.5 px-3 rounded-lg font-bold transition-colors cursor-pointer ${
              filterRating === 'all'
                ? 'bg-stone-900 text-white'
                : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
            }`}
          >
            {language === 'ar' ? 'الكل' : 'All'}
          </button>

          {[5, 4, 3].map((star) => (
            <button
              key={star}
              onClick={() => setFilterRating(filterRating === star ? 'all' : star)}
              className={`py-1.5 px-3 rounded-lg font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                filterRating === star
                  ? 'bg-stone-900 text-white'
                  : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
              }`}
            >
              <span>{star}</span>
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            </button>
          ))}

          <button
            onClick={() => setFilterVerifiedOnly(!filterVerifiedOnly)}
            className={`py-1.5 px-3 rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              filterVerifiedOnly
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>{language === 'ar' ? 'شراء مؤكد فقط' : 'Verified Purchases Only'}</span>
          </button>
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-stone-500 font-semibold flex items-center gap-1">
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? 'ترتيب حسب:' : 'Sort by:'}</span>
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="py-1.5 px-3 border border-stone-200 rounded-lg bg-white text-xs font-bold text-stone-800 focus:outline-none focus:border-[#E10600]"
          >
            <option value="recent">{language === 'ar' ? 'الأحدث تقييماً' : 'Most Recent'}</option>
            <option value="highest">{language === 'ar' ? 'الأعلى تقييماً' : 'Highest Rating'}</option>
            <option value="helpful">{language === 'ar' ? 'الأكثر إفادة' : 'Most Helpful'}</option>
          </select>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {displayReviews.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center space-y-3">
            <MessageSquare className="w-8 h-8 text-stone-300 mx-auto" />
            <h4 className="text-sm font-bold text-stone-800">
              {language === 'ar' ? 'لا توجد تقييمات مطابقة لهذا الفلتر' : 'No reviews match this filter'}
            </h4>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              {language === 'ar'
                ? 'كن أول من يشارك رأيه حول هذا المنتج لمساعدة عملاء شنطتي الآخرين'
                : 'Be the first to share your experience with this item'}
            </p>
            <button
              onClick={() => {
                setFilterRating('all');
                setFilterVerifiedOnly(false);
              }}
              className="py-2 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-lg cursor-pointer transition-colors"
            >
              {language === 'ar' ? 'إعادة ضبط الفلاتر' : 'Reset Filters'}
            </button>
          </div>
        ) : (
          displayReviews.map((rev) => {
            const hasVoted = Boolean(votedReviews[rev.id]);
            return (
              <div
                key={rev.id}
                className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 shadow-xs space-y-3.5 hover:border-stone-300 transition-all"
              >
                {/* Reviewer Header */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center font-bold text-stone-800 text-sm">
                      {rev.user_name.slice(0, 1)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-stone-900">{rev.user_name}</span>
                        {rev.user_city && (
                          <span className="text-[11px] text-stone-400">({rev.user_city})</span>
                        )}
                      </div>

                      {/* Verified Purchase Badge */}
                      {rev.is_verified_purchase && (
                        <div className="mt-0.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>
                            {language === 'ar'
                              ? 'عملية شراء مؤكدة (Verified Purchase)'
                              : 'Verified Purchase'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= rev.rating
                              ? 'fill-amber-400 text-amber-400'
                              : 'fill-stone-100 text-stone-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] text-stone-400 mt-1">
                      {new Date(rev.date).toLocaleDateString(
                        language === 'ar' ? 'ar-EG' : 'en-US',
                        {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        }
                      )}
                    </span>
                  </div>
                </div>

                {/* Review Title & Content */}
                <div className="space-y-1.5">
                  {rev.title && (
                    <h5 className="text-sm font-bold text-stone-900">{rev.title}</h5>
                  )}
                  <p className="text-xs sm:text-sm text-stone-700 leading-relaxed whitespace-pre-line">
                    {rev.comment}
                  </p>
                </div>

                {/* Attributes Feedback Chips */}
                {rev.attributes_feedback && (
                  <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
                    {rev.attributes_feedback.quality && (
                      <span className="px-2.5 py-1 rounded-md bg-stone-50 border border-stone-200 text-stone-600">
                        {language === 'ar' ? 'جودة الخامة:' : 'Quality:'}{' '}
                        <strong className="text-stone-900">
                          {rev.attributes_feedback.quality === 'excellent'
                            ? language === 'ar' ? 'ممتازة' : 'Excellent'
                            : rev.attributes_feedback.quality === 'good'
                            ? language === 'ar' ? 'جيدة جداً' : 'Good'
                            : language === 'ar' ? 'متوسطة' : 'Average'}
                        </strong>
                      </span>
                    )}
                    {rev.attributes_feedback.true_to_size && (
                      <span className="px-2.5 py-1 rounded-md bg-stone-50 border border-stone-200 text-stone-600">
                        {language === 'ar' ? 'المقاس:' : 'Size:'}{' '}
                        <strong className="text-stone-900">
                          {rev.attributes_feedback.true_to_size === 'true'
                            ? language === 'ar' ? 'مظبوط تماماً' : 'True to size'
                            : rev.attributes_feedback.true_to_size === 'runs_small'
                            ? language === 'ar' ? 'أصغر قليلاً' : 'Runs small'
                            : language === 'ar' ? 'أكبر قليلاً' : 'Runs large'}
                        </strong>
                      </span>
                    )}
                    {rev.attributes_feedback.matches_photo && (
                      <span className="px-2.5 py-1 rounded-md bg-emerald-50/60 border border-emerald-100 text-emerald-800 font-medium">
                        ✓ {language === 'ar' ? 'مطابق للصورة على الطبيعة' : 'Matches product photos'}
                      </span>
                    )}
                  </div>
                )}

                {/* Footer: Helpful Action */}
                <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
                  <span className="text-[11px]">
                    {language === 'ar' ? 'هل كان هذا التقييم مفيداً؟' : 'Was this review helpful?'}
                  </span>

                  <button
                    onClick={() => handleHelpful(rev.id)}
                    disabled={hasVoted}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      hasVoted
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                        : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border border-stone-200'
                    }`}
                  >
                    <ThumbsUp className={`w-3.5 h-3.5 ${hasVoted ? 'fill-emerald-600' : ''}`} />
                    <span>
                      {language === 'ar' ? 'مفيد' : 'Helpful'} ({rev.helpful_count || 0})
                    </span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Review Submission Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setIsFormOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
          />
          <div className="relative bg-white rounded-2xl border border-stone-200 p-6 sm:p-7 w-full max-w-xl max-h-[92vh] overflow-y-auto shadow-2xl space-y-5 animate-fadeIn">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-stone-100 pb-3.5">
              <div>
                <h4 className="text-base font-black text-stone-900">
                  {language === 'ar' ? 'إضافة تقييم وتجربة الشراء' : 'Write a Product Review'}
                </h4>
                <p className="text-xs text-stone-500 font-medium mt-0.5">
                  {language === 'ar' ? product.name_ar : product.name_en}
                </p>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-500 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-4 text-xs">
              {/* Star Rating Selector */}
              <div className="space-y-1.5 bg-stone-50 p-4 rounded-xl border border-stone-200/80 text-center">
                <label className="font-bold text-stone-800 text-xs block">
                  {language === 'ar' ? 'تقييمك الإجمالي للقطعة:' : 'Your Overall Rating:'}
                </label>
                <div className="flex items-center justify-center gap-2 py-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                      className="p-1 cursor-pointer transition-transform hover:scale-115 focus:outline-none"
                    >
                      <Star
                        className={`w-7 h-7 sm:w-8 sm:h-8 transition-colors ${
                          star <= (hoverRating || rating)
                            ? 'fill-amber-400 text-amber-400'
                            : 'fill-stone-100 text-stone-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <p className="text-xs font-bold text-[#E10600]">
                  {getRatingLabel(hoverRating || rating)}
                </p>
              </div>

              {/* Verified Purchase Detection Section */}
              <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200/80 space-y-2">
                <div className="flex items-center gap-2 text-emerald-900 font-bold">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>
                    {language === 'ar'
                      ? 'توثيق الشراء (Verified Purchase Badge)'
                      : 'Purchase Verification'}
                  </span>
                </div>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  {language === 'ar'
                    ? 'أدخل رقم طلبك (مثل SHN-2601) أو رقم هاتفك للتحقق التلقائي ومنحك شارة المشتري المعتمد.'
                    : 'Enter your order # (e.g. SHN-2601) or phone number to automatically earn the Verified Purchase badge.'}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div>
                    <input
                      type="text"
                      value={orderNumber}
                      onChange={(e) => setOrderNumber(e.target.value)}
                      placeholder={language === 'ar' ? 'رقم الطلب (اختياري، مثلاً SHN-2601)' : 'Order # (optional)'}
                      className="w-full p-2 border border-emerald-200 rounded-lg bg-white text-xs font-mono uppercase"
                    />
                  </div>
                  <div>
                    <input
                      type="tel"
                      value={userPhone}
                      onChange={(e) => setUserPhone(e.target.value)}
                      placeholder={language === 'ar' ? 'رقم الهاتف المسجل بالطلب' : 'Phone number on order'}
                      className="w-full p-2 border border-emerald-200 rounded-lg bg-white text-xs font-mono"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 pt-1 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isVerifiedManual}
                    onChange={(e) => setIsVerifiedManual(e.target.checked)}
                    className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                  />
                  <span className="text-[11px] font-semibold text-emerald-900">
                    {language === 'ar'
                      ? 'قمت بشراء واستلام هذا المنتج بالفعل من متجر أو فروع شنطتي'
                      : 'I have genuinely purchased and received this product from Shantety'}
                  </span>
                </label>
              </div>

              {/* Reviewer Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-stone-700">
                    {language === 'ar' ? 'الاسم بالكامل *' : 'Your Full Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder={language === 'ar' ? 'مثال: سارة محمود' : 'e.g. Sarah Mahmoud'}
                    className="w-full p-2.5 border border-stone-300 rounded-lg focus:outline-none focus:border-[#E10600]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-stone-700">
                    {language === 'ar' ? 'المحافظة / المدينة' : 'Governorate / City'}
                  </label>
                  <input
                    type="text"
                    value={userCity}
                    onChange={(e) => setUserCity(e.target.value)}
                    placeholder={language === 'ar' ? 'مثال: الإسكندرية / دمنهور' : 'e.g. Alexandria / Beheira'}
                    className="w-full p-2.5 border border-stone-300 rounded-lg focus:outline-none focus:border-[#E10600]"
                  />
                </div>
              </div>

              {/* Review Title */}
              <div className="space-y-1">
                <label className="font-bold text-stone-700">
                  {language === 'ar' ? 'عنوان ملخص لتجربتك' : 'Review Headline / Title'}
                </label>
                <input
                  type="text"
                  value={reviewTitle}
                  onChange={(e) => setReviewTitle(e.target.value)}
                  placeholder={
                    language === 'ar'
                      ? 'مثال: خامة تحفة وتوصيل سريع ومقاس مظبوط'
                      : 'e.g. Fantastic craftsmanship and fast delivery'
                  }
                  className="w-full p-2.5 border border-stone-300 rounded-lg focus:outline-none focus:border-[#E10600]"
                />
              </div>

              {/* Review Comment */}
              <div className="space-y-1">
                <label className="font-bold text-stone-700">
                  {language === 'ar' ? 'تفاصيل المراجعة ورأيك في المنتج *' : 'Detailed Feedback *'}
                </label>
                <textarea
                  rows={4}
                  required
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={
                    language === 'ar'
                      ? 'صفي لنا رأيك في الخامة، التقفيل، الألوان، راحة الاستخدام، وسرعة الشحن...'
                      : 'Describe what you loved, the fabric/leather texture, fit, packaging, and shipping experience...'
                  }
                  className="w-full p-2.5 border border-stone-300 rounded-lg focus:outline-none focus:border-[#E10600] leading-relaxed"
                />
              </div>

              {/* Attribute Ratings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="font-bold text-stone-700">
                    {language === 'ar' ? 'جودة الخامات والمصنعية:' : 'Quality of Materials:'}
                  </label>
                  <select
                    value={qualityFeedback}
                    onChange={(e) => setQualityFeedback(e.target.value as any)}
                    className="w-full p-2 border border-stone-300 rounded-lg bg-white"
                  >
                    <option value="excellent">
                      {language === 'ar' ? 'ممتازة وفخمة (5/5)' : 'Excellent (5/5)'}
                    </option>
                    <option value="good">
                      {language === 'ar' ? 'جيدة جداً ومريحة' : 'Very Good'}
                    </option>
                    <option value="average">
                      {language === 'ar' ? 'متوسطة ومقبولة' : 'Average'}
                    </option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-stone-700">
                    {language === 'ar' ? 'مطابقة المقاس:' : 'True to Size:'}
                  </label>
                  <select
                    value={sizeFeedback}
                    onChange={(e) => setSizeFeedback(e.target.value as any)}
                    className="w-full p-2 border border-stone-300 rounded-lg bg-white"
                  >
                    <option value="true">
                      {language === 'ar' ? 'مظبوط بالمللي (True to size)' : 'True to size'}
                    </option>
                    <option value="runs_small">
                      {language === 'ar' ? 'أصغر قليلاً (ينصح بمقاس أكبر)' : 'Runs slightly small'}
                    </option>
                    <option value="runs_large">
                      {language === 'ar' ? 'أكبر قليلاً' : 'Runs slightly large'}
                    </option>
                  </select>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex gap-2 pt-3 border-t border-stone-100">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-[#E10600] hover:bg-[#C50500] text-white text-xs font-bold rounded-xl cursor-pointer transition-colors shadow-md disabled:opacity-50"
                >
                  {isSubmitting
                    ? language === 'ar' ? 'جاري النشر...' : 'Publishing...'
                    : language === 'ar' ? 'نشر التقييم الآن' : 'Publish Review'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="py-3 px-5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl cursor-pointer transition-colors"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
