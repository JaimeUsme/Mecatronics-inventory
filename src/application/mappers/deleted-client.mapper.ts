import { DeletedClientDto } from '@presentation/dto';

export function mapWisproDeletedClientToDto(client: any): DeletedClientDto {
  return {
    id: client.id || '',
    details: client.details || '',
    name: client.name || '',
    email: client.email || '',
    phone: client.phone || '',
    address: client.address || '',
    phone_mobile: client.phone_mobile || '',
    documento: client.national_identification_number || '',
    custom_id: client.custom_id || '',
    balance_amount: client.invoicing_client?.current_account?.balance_amount || '0.0',
  };
}

export function mapWisproDeletedClientsToDto(clients: any[]): DeletedClientDto[] {
  return clients.map(mapWisproDeletedClientToDto);
}
