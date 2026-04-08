import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Star, MessageSquare, Heart, Terminal, Send } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface FeedbackOverlayProps {
  userId: string;
  onClose: () => void;
}

type Step = 'PROMO' | 'EMAIL' | 'QUESTIONS' | 'SUCCESS';

export const FeedbackOverlay: React.FC<FeedbackOverlayProps> = ({ userId, onClose }) => {
  const [step, setStep] = useState<Step>('PROMO');
  const [email, setEmail] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [loading, setLoading] = useState(false);

  const questions = [
    { q: "Overall Atmosphere", type: "rating", icon: <Star className="text-yellow-400" /> },
    { q: "Audio Generation Quality", type: "rating", icon: <Heart className="text-pink-500" /> },
    { q: "Is the UI easy to navigate?", type: "boolean", icon: <Terminal className="text-blue-400" /> },
    { q: "Favorite Feature", type: "options", options: ["Dance Floor", "DJ Booth", "The Box", "Chat"], icon: <MessageSquare className="text-purple-400" /> },
    { q: "Mobile Performance", type: "rating", icon: <Star className="text-green-400" /> },
    { q: "How did you find the Club?", type: "options", options: ["Social Media", "Discord", "Friend", "Search"], icon: <Send className="text-zinc-400" /> },
    { q: "Any bugs encountered?", type: "boolean", icon: <Terminal className="text-red-400" /> },
    { q: "Likely to recommend?", type: "rating", icon: <Heart className="text-rose-400" /> },
    { q: "Feature Request (Top Priority)", type: "text", icon: <MessageSquare className="text-cyan-400" /> },
    { q: "Willing to do an interview?", type: "boolean", icon: <Star className="text-amber-400" /> }
  ];

  const handleAnswer = (value: any) => {
    setAnswers({ ...answers, [currentQuestion]: value });
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      submitFeedback();
    }
  };

  const submitFeedback = async () => {
    setLoading(true);
    try {
      // Mock submission or broadcasting
      console.log("Feedback Submitted:", { email, answers });
      
      // In a real scenario: 
      // await supabase.from('feedback').insert([{ user_id: userId, email, answers, created_at: new Date() }]);
      
      // Update profile to show they've done it
      await supabase
        .from('profiles')
        .update({ is_premium: true }) // Grant the free month benefit
        .eq('user_id', userId);

      setStep('SUCCESS');
    } catch (err) {
      console.error("Error submitting feedback:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/80 backdrop-blur-xl"
        onClick={onClose}
      />

      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="relative w-full max-w-md bg-zinc-950 border border-white/10 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(168,85,247,0.2)]"
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-white transition-colors z-10"
        >
          <X size={20} />
        </button>

        <div className="p-8">
          <AnimatePresence mode="wait">
            {step === 'PROMO' && (
              <motion.div 
                key="promo"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col items-center text-center space-y-6"
              >
                <div className="w-20 h-20 bg-linear-to-br from-purple-500 to-pink-500 rounded-3xl flex items-center justify-center shadow-lg shadow-purple-500/30">
                  <Star size={40} className="text-white fill-white" />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-2">1 Month Free</h2>
                  <p className="text-zinc-400 text-sm font-medium leading-relaxed">
                    We're building the future of sonic experiences. 
                    Your feedback helps us evolve. Complete this quick questionnaire and get 30 days of Premium access on the house.
                  </p>
                </div>
                <button 
                  onClick={() => setStep('EMAIL')}
                  className="w-full py-4 bg-white text-black font-black uppercase tracking-widest rounded-2xl hover:bg-purple-500 hover:text-white transition-all transform active:scale-95"
                >
                  Let's Begin
                </button>
              </motion.div>
            )}

            {step === 'EMAIL' && (
              <motion.div 
                key="email"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-widest mb-1">The Guest List</h3>
                  <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider">Where should we send your reward?</p>
                </div>
                <div className="relative">
                  <input 
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="architect@youniverse.live"
                    className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 px-6 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all font-mono"
                  />
                </div>
                <button 
                  disabled={!email.includes('@')}
                  onClick={() => setStep('QUESTIONS')}
                  className={`w-full py-4 font-black uppercase tracking-widest rounded-2xl transition-all ${email.includes('@') ? 'bg-purple-600 text-white hover:bg-purple-50' : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'}`}
                >
                  Enter Questionnaire
                </button>
              </motion.div>
            )}

            {step === 'QUESTIONS' && (
              <motion.div 
                key="questions"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-purple-500 uppercase tracking-[0.3em]">
                    Step {currentQuestion + 1} of {questions.length}
                  </span>
                  <div className="w-24 h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-purple-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-12 h-12 bg-zinc-900 rounded-xl flex items-center justify-center border border-white/5">
                    {questions[currentQuestion].icon}
                  </div>
                  <h3 className="text-lg font-bold text-white leading-tight">
                    {questions[currentQuestion].q}
                  </h3>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {questions[currentQuestion].type === 'rating' && (
                    <div className="flex justify-between gap-1">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(val => (
                        <button
                          key={val}
                          onClick={() => handleAnswer(val)}
                          className="flex-1 h-10 flex items-center justify-center bg-zinc-900 border border-white/5 rounded-lg text-[10px] font-bold text-zinc-400 hover:bg-purple-600 hover:text-white hover:border-purple-400 transition-all"
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  )}

                  {questions[currentQuestion].type === 'boolean' && (
                    <div className="flex gap-4">
                      {['YES', 'NO'].map(val => (
                        <button
                          key={val}
                          onClick={() => handleAnswer(val)}
                          className="flex-1 py-4 bg-zinc-900 border border-white/5 rounded-2xl font-black text-xs text-zinc-400 hover:bg-zinc-800 hover:text-white transition-all uppercase tracking-widest"
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  )}

                  {questions[currentQuestion].type === 'options' && (
                    <div className="grid grid-cols-2 gap-3">
                      {questions[currentQuestion].options?.map(opt => (
                        <button
                          key={opt}
                          onClick={() => handleAnswer(opt)}
                          className="py-3 bg-zinc-900 border border-white/5 rounded-xl font-bold text-[10px] text-zinc-400 hover:bg-zinc-800 hover:text-white transition-all uppercase tracking-wider"
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}

                  {questions[currentQuestion].type === 'text' && (
                    <div className="space-y-4">
                      <textarea 
                        className="w-full bg-zinc-900 border border-white/5 rounded-2xl p-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 min-h-[100px]"
                        placeholder="Type your thoughts..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleAnswer(e.currentTarget.value);
                          }
                        }}
                      />
                      <button 
                        onClick={(e) => {
                          const ta = (e.currentTarget.previousSibling as HTMLTextAreaElement);
                          handleAnswer(ta.value);
                        }}
                        className="w-full py-4 bg-purple-600 text-white font-black uppercase tracking-widest rounded-2xl"
                      >
                        Submit Answer
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {step === 'SUCCESS' && (
              <motion.div 
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center text-center space-y-6"
              >
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center border border-green-500/30">
                  <Check size={40} className="text-green-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Benefit Activated</h2>
                  <p className="text-zinc-400 text-sm font-medium leading-relaxed">
                    Thank you for your insights! 1 Month Premium access has been credited to your node. Check your profile to see the updated status.
                  </p>
                </div>
                <button 
                  onClick={onClose}
                  className="w-full py-4 bg-zinc-900 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-zinc-800 transition-all"
                >
                  Return to Club
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20">
            <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </motion.div>
    </div>
  );
};
