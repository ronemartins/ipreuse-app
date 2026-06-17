-- init-db.sql

-- 1. Create tables without foreign keys first or order correctly
CREATE TABLE public.address (
  id SERIAL PRIMARY KEY,
  zipcode varchar NOT NULL,
  country varchar NOT NULL DEFAULT 'BRA',
  state varchar NOT NULL,
  city varchar NOT NULL,
  street varchar NOT NULL,
  address_line_2 varchar,
  number integer NOT NULL,
  land_mark varchar,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone
);

CREATE TABLE public.enterprise (
  id SERIAL PRIMARY KEY,
  name varchar NOT NULL,
  document varchar NOT NULL UNIQUE,
  email varchar NOT NULL,
  phone varchar,
  address_id integer NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone,
  deleted_at timestamp without time zone,
  CONSTRAINT fk_enterprise_address FOREIGN KEY (address_id) REFERENCES public.address(id)
);

CREATE TABLE public.role (
  id SERIAL PRIMARY KEY,
  name varchar NOT NULL,
  description varchar NOT NULL,
  company_id integer NOT NULL,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone,
  deleted_at timestamp without time zone,
  CONSTRAINT fk_role_company FOREIGN KEY (company_id) REFERENCES public.enterprise(id)
);

CREATE TABLE public.permission (
  id SERIAL PRIMARY KEY,
  code varchar NOT NULL UNIQUE,
  description varchar NOT NULL,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone,
  deleted_at timestamp without time zone
);

CREATE TABLE public.role_permission (
  id SERIAL PRIMARY KEY,
  role_id integer NOT NULL,
  permission_id integer NOT NULL,
  CONSTRAINT fk_rp_role FOREIGN KEY (role_id) REFERENCES public.role(id),
  CONSTRAINT fk_rp_permission FOREIGN KEY (permission_id) REFERENCES public.permission(id)
);

CREATE TABLE public.users (
  id SERIAL PRIMARY KEY,
  company_id integer NOT NULL,
  username varchar NOT NULL UNIQUE,
  email varchar,
  password varchar NOT NULL,
  name varchar NOT NULL,
  surname varchar NOT NULL,
  phone varchar,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone,
  deleted_at timestamp without time zone,
  CONSTRAINT fk_user_company FOREIGN KEY (company_id) REFERENCES public.enterprise(id)
);

CREATE TABLE public.user_role (
  id SERIAL PRIMARY KEY,
  user_id integer NOT NULL,
  role_id integer NOT NULL,
  CONSTRAINT fk_ur_user FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT fk_ur_role FOREIGN KEY (role_id) REFERENCES public.role(id)
);

CREATE TABLE public.license (
  id SERIAL PRIMARY KEY,
  name varchar NOT NULL,
  description text NOT NULL,
  url varchar,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.ip_core (
  id SERIAL PRIMARY KEY,
  company_id integer NOT NULL,
  created_by integer NOT NULL,
  title varchar NOT NULL,
  description varchar NOT NULL,
  type varchar NOT NULL,
  maturity_level varchar NOT NULL,
  compatibility varchar NOT NULL,
  development_software varchar,
  license_id integer NOT NULL,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone,
  deleted_at timestamp without time zone,
  CONSTRAINT fk_ip_company FOREIGN KEY (company_id) REFERENCES public.enterprise(id),
  CONSTRAINT fk_ip_creator FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT fk_ip_license FOREIGN KEY (license_id) REFERENCES public.license(id)
);

CREATE TABLE public.ip_comment (
  id SERIAL PRIMARY KEY,
  ip_id integer NOT NULL,
  user_id integer NOT NULL,
  comment text NOT NULL,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ipc_ip FOREIGN KEY (ip_id) REFERENCES public.ip_core(id),
  CONSTRAINT fk_ipc_user FOREIGN KEY (user_id) REFERENCES public.users(id)
);

CREATE TABLE public.ip_file (
  id SERIAL PRIMARY KEY,
  ip_id integer NOT NULL,
  version integer NOT NULL,
  author_id integer NOT NULL,
  data_path varchar NOT NULL,
  type varchar NOT NULL,
  tam integer NOT NULL,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  changes text,
  CONSTRAINT fk_ipf_ip FOREIGN KEY (ip_id) REFERENCES public.ip_core(id),
  CONSTRAINT fk_ipf_author FOREIGN KEY (author_id) REFERENCES public.users(id)
);

CREATE TABLE public.ip_version_history (
  id SERIAL PRIMARY KEY,
  ip_id integer NOT NULL,
  author_id integer NOT NULL,
  version varchar NOT NULL,
  description varchar NOT NULL,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_iph_ip FOREIGN KEY (ip_id) REFERENCES public.ip_core(id),
  CONSTRAINT fk_iph_author FOREIGN KEY (author_id) REFERENCES public.users(id)
);

-- Seed data for testing

INSERT INTO public.address (zipcode, country, state, city, street, number) VALUES 
('12345-678', 'BRA', 'SP', 'São Paulo', 'Avenida Paulista', 1000);

INSERT INTO public.enterprise (name, document, email, address_id) VALUES 
('Tech Corp', '12.345.678/0001-90', 'contact@techcorp.com', 1);

INSERT INTO public.users (company_id, username, email, password, name, surname) VALUES 
(1, 'admin', 'admin@techcorp.com', 'admin123', 'Admin', 'User');

INSERT INTO public.license (name, description) VALUES 
('MIT', 'MIT License'), ('GPL', 'GNU General Public License');

INSERT INTO public.ip_core (company_id, created_by, title, description, type, maturity_level, compatibility, license_id) VALUES 
(1, 1, 'Núcleo RISC-V de Alto Desempenho', 'Processador RISC-V RV32IM de alto desempenho', 'digital', 'validado', 'Linux', 1),
(1, 1, 'Controlador UART Avançado', 'Controlador UART multi-protocolo', 'digital', 'prototipado', 'FreeRTOS', 1);
