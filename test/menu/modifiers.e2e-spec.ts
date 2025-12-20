import { Test, TestingModule } from '@nestjs/testing';
import { ModifiersController } from '../../src/menu/modifiers.controller';
import { ModifiersService } from '../../src/menu/modifiers.service';

describe('ModifiersController', () => {
  let controller: ModifiersController;
  let service: ModifiersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ModifiersController],
      providers: [
        {
          provide: ModifiersService,
          useValue: {
            findAllGroups: jest.fn(),
            findOneGroup: jest.fn(),
            findGroupsByItem: jest.fn(),
            createGroup: jest.fn(),
            updateGroup: jest.fn(),
            deleteGroup: jest.fn(),
            findAllOptions: jest.fn(),
            findOneOption: jest.fn(),
            findOptionsByGroup: jest.fn(),
            createOption: jest.fn(),
            updateOption: jest.fn(),
            deleteOption: jest.fn(),
            validateModifierSelection: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ModifiersController>(ModifiersController);
    service = module.get<ModifiersService>(ModifiersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('Modifier Groups', () => {
    it('should return all groups', async () => {
      const mockGroups = [{ id: 1, name: 'Size' }];
      jest.spyOn(service, 'findAllGroups').mockResolvedValue(mockGroups as any);

      const result = await controller.findAllGroups();
      expect(result).toEqual({ groups: mockGroups });
    });

    it('should return a single group', async () => {
      const mockGroup = { id: 1, name: 'Size' };
      jest.spyOn(service, 'findOneGroup').mockResolvedValue(mockGroup as any);

      const result = await controller.findOneGroup(1);
      expect(result).toEqual(mockGroup);
    });

    it('should create a group', async () => {
      const mockGroup = {
        id: 1,
        name: 'Size',
        type: 'single' as const,
        is_required: false,
        menu_item_id: 1,
      };
      jest.spyOn(service, 'createGroup').mockResolvedValue(mockGroup as any);

      const result = await controller.createGroup(mockGroup);
      expect(result).toEqual(mockGroup);
    });

    it('should update a group', async () => {
      const mockGroup = { id: 1, name: 'Updated Size' };
      jest.spyOn(service, 'updateGroup').mockResolvedValue(mockGroup as any);

      const result = await controller.updateGroup(1, { name: 'Updated Size' });
      expect(result).toEqual(mockGroup);
    });

    it('should delete a group', async () => {
      jest.spyOn(service, 'deleteGroup').mockResolvedValue(undefined);

      await expect(controller.deleteGroup(1)).resolves.toBeUndefined();
    });
  });

  describe('Modifier Options', () => {
    it('should return all options', async () => {
      const mockOptions = [{ id: 1, name: 'Large' }];
      jest
        .spyOn(service, 'findAllOptions')
        .mockResolvedValue(mockOptions as any);

      const result = await controller.findAllOptions();
      expect(result).toEqual({ options: mockOptions });
    });

    it('should return a single option', async () => {
      const mockOption = { id: 1, name: 'Large' };
      jest.spyOn(service, 'findOneOption').mockResolvedValue(mockOption as any);

      const result = await controller.findOneOption(1);
      expect(result).toEqual(mockOption);
    });

    it('should create an option', async () => {
      const mockOption = {
        id: 1,
        name: 'Large',
        modifier_group_id: 1,
        price_adjustment: '2.00',
      };
      jest.spyOn(service, 'createOption').mockResolvedValue(mockOption as any);

      const result = await controller.createOption(mockOption);
      expect(result).toEqual(mockOption);
    });

    it('should update an option', async () => {
      const mockOption = { id: 1, name: 'Extra Large' };
      jest.spyOn(service, 'updateOption').mockResolvedValue(mockOption as any);

      const result = await controller.updateOption(1, { name: 'Extra Large' });
      expect(result).toEqual(mockOption);
    });

    it('should delete an option', async () => {
      jest.spyOn(service, 'deleteOption').mockResolvedValue(undefined);

      await expect(controller.deleteOption(1)).resolves.toBeUndefined();
    });
  });

  describe('Validation', () => {
    it('should validate modifier selection', async () => {
      const mockValidation = { valid: true, errors: [] };
      jest
        .spyOn(service, 'validateModifierSelection')
        .mockResolvedValue(mockValidation);

      const result = await service.validateModifierSelection(1, [1, 2]);
      expect(result).toEqual(mockValidation);
    });
  });
});
