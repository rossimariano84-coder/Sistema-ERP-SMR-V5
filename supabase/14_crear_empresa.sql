-- 14 - Alta de empresa desde la app (las reglas de seguridad no permiten insertar empresas directamente)
-- Requiere: schema_fases_1_a_4.sql, 02, 04, 06, 08, 10 y 12.
create or replace function crear_empresa(
  p_razon_social text, p_cuit text, p_condicion_iva condicion_iva,
  p_tipo_contribuyente text default 'persona_humana'
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid := gen_random_uuid(); v_cuit text := regexp_replace(coalesce(p_cuit, ''), '\D', '', 'g');
begin
  if auth.uid() is null then raise exception 'Tenés que iniciar sesión'; end if;
  if length(trim(coalesce(p_razon_social, ''))) = 0 then raise exception 'Indicá la razón social'; end if;
  if length(v_cuit) <> 11 then raise exception 'El CUIT debe tener 11 dígitos'; end if;
  if p_condicion_iva not in ('responsable_inscripto', 'monotributista') then
    raise exception 'La condición ante IVA debe ser Responsable Inscripto o Monotributista';
  end if;
  insert into empresas (id, razon_social, cuit, condicion_iva, tipo_contribuyente)
    values (v_id, trim(p_razon_social), v_cuit, p_condicion_iva, p_tipo_contribuyente);
  insert into miembros (empresa_id, user_id, rol) values (v_id, auth.uid(), 'dueno');
  insert into puntos_venta (empresa_id, numero, descripcion) values (v_id, 1, 'Principal');
  perform inicializar_empresa(v_id);   -- caja por defecto y categorías de egreso
  return v_id;
end $$;
