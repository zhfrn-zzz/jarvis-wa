import axios from 'axios';

/**
 * Centralized AI handler with automatic failover between multiple providers
 * Priority order: Groq -> Google Gemini -> Hugging Face
 */
export async function getAIResponse(prompt: string, imageBase64?: string): Promise<string> {
  // Skip Groq if image is present (Groq doesn't support vision)
  if (!imageBase64) {
    // Priority 1: Try Groq for text-only queries
    try {
      console.log('[AI Handler] Trying Groq API...');
      const groqResponse = await callGroqAPI(prompt);
      console.log('[AI Handler] Groq API successful');
      return groqResponse;
    } catch (error) {
      console.log('[AI Handler] Groq failed, trying Gemini...', error instanceof Error ? error.message : String(error));
    }
  } else {
    console.log('[AI Handler] Image detected, skipping Groq (no vision support) and using Gemini directly...');
  }

  // Priority 2: Try Google Gemini (supports vision)
  try {
    console.log('[AI Handler] Trying Google Gemini API...');
    const geminiResponse = await callGeminiAPI(prompt, imageBase64);
    console.log('[AI Handler] Google Gemini API successful');
    return geminiResponse;
  } catch (error) {
    console.log('[AI Handler] Gemini failed, trying Hugging Face...', error instanceof Error ? error.message : String(error));
  }

  // Priority 3: Try Hugging Face
  try {
    console.log('[AI Handler] Trying Hugging Face API...');
    const hfResponse = await callHuggingFaceAPI(prompt);
    console.log('[AI Handler] Hugging Face API successful');
    return hfResponse;
  } catch (error) {
    console.log('[AI Handler] Hugging Face failed:', error instanceof Error ? error.message : String(error));
  }

  // All providers failed
  return '❌ Maaf, semua layanan AI sedang sibuk. Coba lagi beberapa saat.';
}

/**
 * Call Groq API
 */
async function callGroqAPI(prompt: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY not configured');
  }

  const response = await axios.post(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 1000,
      temperature: 0.7
    },
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    }
  );

  return response.data.choices[0].message.content.trim();
}

/**
 * Call Google Gemini API (supports vision)
 */
async function callGeminiAPI(prompt: string, imageBase64?: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  // Build content parts
  const parts: any[] = [
    {
      text: prompt
    }
  ];

  // Add image if provided
  if (imageBase64) {
    parts.unshift({
      inline_data: {
        mime_type: "image/jpeg",
        data: imageBase64
      }
    });
  }

  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      contents: [
        {
          parts: parts
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1000
      }
    },
    {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    }
  );

  return response.data.candidates[0].content.parts[0].text.trim();
}

/**
 * Call Hugging Face Inference API
 */
async function callHuggingFaceAPI(prompt: string): Promise<string> {
  const token = process.env.HF_TOKEN;
  if (!token) {
    throw new Error('HF_TOKEN not configured');
  }

  const response = await axios.post(
    'https://api-inference.huggingface.co/models/bigscience/bloom-560m',
    {
      inputs: prompt,
      parameters: {
        max_new_tokens: 1000,
        temperature: 0.7,
        return_full_text: false
      }
    },
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    }
  );

  // Hugging Face response format
  if (Array.isArray(response.data) && response.data.length > 0) {
    const generatedText = response.data[0].generated_text;
    if (typeof generatedText === 'string') {
      // Remove the original prompt from the response
      const cleanedResponse = generatedText.replace(prompt, '').trim();
      return cleanedResponse || generatedText.trim() || 'Maaf, tidak ada respons yang dihasilkan.';
    }
    // If generated_text is not a string, throw error
    throw new Error('Generated text is not a string');
  } else if (response.data.generated_text) {
    return response.data.generated_text.trim();
  } else {
    throw new Error('Unexpected Hugging Face response format');
  }
}