export class DeletedClientDto {
  id: string;
  details: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  phone_mobile: string;
  documento: string;
  custom_id: string;
  balance_amount: string;
}

export class GetDeletedClientsResponseDto {
  clients: DeletedClientDto[];
}
