-- Insert test user
INSERT INTO public.users (company_id, username, email, password, name, surname, is_active) 
VALUES (1, 'joao.silva', 'joao.silva@ufsc.br', 'senha123', 'João', 'Silva', true)
ON CONFLICT (username) DO NOTHING;
