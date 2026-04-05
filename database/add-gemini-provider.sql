-- Add Gemini provider and models to app_settings

-- Insert Gemini provider
INSERT INTO app_settings (user_id, category, key, value, description) VALUES
  (NULL, 'providers', 'gemini', '{
    "label": "Google Gemini",
    "baseUrl": "",
    "requiresApiKey": true,
    "description": "Google''s Gemini AI models with function calling support"
  }', 'Gemini AI provider configuration')
ON CONFLICT (user_id, category, key) DO NOTHING;

-- Insert Gemini models
INSERT INTO app_settings (user_id, category, key, value, description) VALUES
  -- Free tier models
  (NULL, 'models', 'gemini:gemini-2.5-flash-lite', '{
    "id": "gemini-2.5-flash-lite",
    "label": "Gemini 2.5 Flash Lite",
    "category": "free",
    "toolSupport": true,
    "maxTokens": 8192,
    "costPerToken": 0,
    "description": "Fastest and most cost-effective model with function calling"
  }', 'Gemini 2.5 Flash Lite model'),
  
  (NULL, 'models', 'gemini:gemini-2.5-flash', '{
    "id": "gemini-2.5-flash",
    "label": "Gemini 2.5 Flash",
    "category": "free",
    "toolSupport": true,
    "maxTokens": 8192,
    "costPerToken": 0,
    "description": "Best price-performance with thinking (limited free tier)"
  }', 'Gemini 2.5 Flash model'),
  
  (NULL, 'models', 'gemini:gemini-3-flash-preview', '{
    "id": "gemini-3-flash-preview",
    "label": "Gemini 3 Flash Preview",
    "category": "free",
    "toolSupport": true,
    "maxTokens": 8192,
    "costPerToken": 0,
    "description": "Balanced speed and intelligence with advanced function calling"
  }', 'Gemini 3 Flash Preview model'),
  
  -- Paid tier models
  (NULL, 'models', 'gemini:gemini-3-pro-preview', '{
    "id": "gemini-3-pro-preview",
    "label": "Gemini 3 Pro Preview",
    "category": "paid",
    "toolSupport": true,
    "maxTokens": 8192,
    "costPerToken": 0.00125,
    "description": "Most powerful model for complex tasks"
  }', 'Gemini 3 Pro Preview model'),
  
  (NULL, 'models', 'gemini:gemini-2.5-pro', '{
    "id": "gemini-2.5-pro",
    "label": "Gemini 2.5 Pro",
    "category": "paid",
    "toolSupport": true,
    "maxTokens": 8192,
    "costPerToken": 0.00125,
    "description": "State-of-the-art thinking model"
  }', 'Gemini 2.5 Pro model')
ON CONFLICT (user_id, category, key) DO NOTHING;
