package com.codeWithProject.HotelServer.controller.auth;

import com.codeWithProject.HotelServer.entity.Table;
import com.codeWithProject.HotelServer.enums.TableType;
import com.codeWithProject.HotelServer.services.Table.TableService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tables")
@CrossOrigin
public class TableController {

    @Autowired
    private TableService tableService;

    // CREATE
    @PostMapping
    public Table addTable(@RequestBody Table table) {
        return tableService.addTable(table);
    }

    // GET ALL
    @GetMapping
    public List<Table> getAllTables() {
        return tableService.getAllTables();
    }

    // GET BY ID
    @GetMapping("/{id}")
    public Table getTable(@PathVariable Long id) {
        return tableService.getTableById(id);
    }

    // FILTER
    @GetMapping("/type/{type}")
    public List<Table> getTablesByType(@PathVariable TableType type) {
        return tableService.getTablesByType(type);
    }

    // UPDATE
    @PutMapping("/{id}")
    public Table updateTable(@PathVariable Long id, @RequestBody Table table) {
        return tableService.updateTable(id, table);
    }

    // DELETE
    @DeleteMapping("/{id}")
    public void deleteTable(@PathVariable Long id) {
        tableService.deleteTable(id);
    }
}