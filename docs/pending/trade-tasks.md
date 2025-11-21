# Pending Trade-Related Tasks

## CP-F04-01J – Trigger / RPC to update user progress on listing sale
- **Descripción:** La función RPC `mark_listing_sold_and_decrement` está invertida: incrementa el conteo en `user_template_progress` en lugar de decrementarlo cuando se vende un listado.
- **Acción requerida:** Corregir la lógica para que **decremente** la cantidad del sticker vendido (o ajuste el estado apropiado) y validar que el trigger (si existe) se ejecute correctamente.
- **Prioridad:** Alta
- **Responsable:** Equipo de Backend / Base de datos

## CP-F05-02K – Prevención de propuestas de intercambio duplicadas
- **Descripción:** No existe constraint UNIQUE ni índice parcial en `trade_proposals` para evitar propuestas duplicadas en estado `pending`. La función `create_trade_proposal` tampoco valida duplicados.
- **Acción requerida:** Añadir un índice UNIQUE parcial (`from_user`, `to_user`, `collection_id`) con condición `status = 'pending'` y/o actualizar la función para validar antes de insertar.
- **Prioridad:** Alta
- **Responsable:** Equipo de Base de datos
