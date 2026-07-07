package com.codeWithProject.HotelServer.services.Table;

import com.codeWithProject.HotelServer.entity.Table;
import com.codeWithProject.HotelServer.enums.TableType;
import com.codeWithProject.HotelServer.repository.TableRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TableService {

    @Autowired
    private TableRepository tableRepository;

    // Set Table Type based on capacity
    private TableType getTypeByCapacity(int capacity) {
        if (capacity == 1) {
            return TableType.SOLO;
        } else if (capacity == 2) {
            return TableType.DOUBLE;
        } else {
            return TableType.DELUXE;
        }
    }

    private void validateTable(Table table) {
        if (table == null) {
            throw new RuntimeException("Table details are required");
        }

        if (table.getTableNumber() <= 0) {
            throw new RuntimeException("Table number must be greater than 0");
        }

        if (table.getCapacity() <= 0) {
            throw new RuntimeException("Table capacity must be greater than 0");
        }

        if (table.getPrice() < 0) {
            throw new RuntimeException("Table price cannot be negative");
        }
    }

    // CREATE
//    public Table addTable(Table table) {
//        table.setAvailable(true);
//        table.setType(getTypeByCapacity(table.getCapacity()));
//        return tableRepository.save(table);
//    }

    public Table addTable(Table table) {
        validateTable(table);

        if (tableRepository.existsByTableNumber(table.getTableNumber())) {
            throw new RuntimeException("Table number already exists");
        }

        table.setAvailable(true); //  important
        table.setType(getTypeByCapacity(table.getCapacity()));
        return tableRepository.save(table);
    }

    // READ ALL
    public List<Table> getAllTables() {
        return tableRepository.findAll();
    }

    // READ BY ID
    public Table getTableById(Long id) {
        return tableRepository.findById(id).orElse(null);
    }

    // FILTER BY TYPE
    public List<Table> getTablesByType(TableType type) {
        return tableRepository.findByType(type);
    }

    // UPDATE
//    public Table updateTable(Long id, Table updatedTable) {
//        Table table = tableRepository.findById(id).orElse(null);
//
//        if (table != null) {
//            table.setTableNumber(updatedTable.getTableNumber());
//            table.setCapacity(updatedTable.getCapacity());
//            table.setAvailable(updatedTable.isAvailable());
//            table.setType(getTypeByCapacity(updatedTable.getCapacity()));
//
//            return tableRepository.save(table);
//        }
//        return null;
//    }

    public Table updateTable(Long id, Table updatedTable) {
        validateTable(updatedTable);

        Table table = tableRepository.findById(id).orElse(null);

        if (table != null) {
            if (table.getTableNumber() != updatedTable.getTableNumber()
                    && tableRepository.existsByTableNumber(updatedTable.getTableNumber())) {
                throw new RuntimeException("Table number already exists");
            }

            table.setTableNumber(updatedTable.getTableNumber());
            table.setCapacity(updatedTable.getCapacity());

            if (updatedTable.getAvailable() != null) {
                table.setAvailable(updatedTable.getAvailable());
            }

            table.setType(getTypeByCapacity(updatedTable.getCapacity()));

            return tableRepository.save(table);
        }
        return null;
    }

    // DELETE
    public void deleteTable(Long id) {
        tableRepository.deleteById(id);
    }
}
