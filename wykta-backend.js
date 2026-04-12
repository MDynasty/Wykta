import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { ingredients, lang, targetLanguage, promptLanguage } = await req.json()

    console.log('Request:', { ingredients, lang, targetLanguage, promptLanguage })

    // Simple AI analysis based on language
    let analysis = ''

    if (lang === 'en' || lang.startsWith('en')) {
      analysis = `English Analysis:\n${ingredients.join(', ')} are common skincare ingredients.`
    } else if (lang === 'fr-FR' || lang.startsWith('fr')) {
      analysis = `Analyse Française:\n${ingredients.join(', ')} sont des ingrédients courants dans les soins de la peau.`
    } else if (lang === 'de-DE' || lang.startsWith('de')) {
      analysis = `Deutsche Analyse:\n${ingredients.join(', ')} sind häufige Inhaltsstoffe in der Hautpflege.`
    } else if (lang === 'zh-CN' || lang.startsWith('zh')) {
      analysis = `中文分析:\n${ingredients.join('、')} 是常见的护肤成分。`
    } else {
      analysis = `Analysis in ${targetLanguage}:\n${ingredients.join(', ')} are skincare ingredients.`
    }

    return new Response(
      JSON.stringify({ analysis }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error(error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})